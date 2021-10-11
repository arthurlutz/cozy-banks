import CozyClient, { createMockClient } from 'cozy-client'
import { sendNotification } from 'cozy-notifications'

import matchAll from 'utils/matchAll'
import {
  sendTriggerNotifications,
  destroyObsoleteTrigger
} from './konnectorAlerts'
import logger from 'ducks/konnectorAlerts/logger'

jest.mock('ducks/konnectorAlerts/logger', () => jest.fn())

jest.mock('cozy-notifications', () => {
  const notifications = jest.requireActual('cozy-notifications')
  return {
    ...notifications,
    sendNotification: jest
      .fn()
      .mockImplementation(notifications.sendNotification)
  }
})

jest.mock('cozy-ui/transpiled/react/AppLinker', () => ({
  generateUniversalLink: () => 'universal-link'
}))

const events = [
  '2020-01-01 konnector-1 OK',
  '2020-01-02 konnector-1 LOGIN_FAILED',

  '2020-01-01 konnector-2 OK',
  '2020-01-02 konnector-2 VENDOR_DOWN',
  '2020-01-03 konnector-2 LOGIN_FAILED',

  '2020-01-01 konnector-3 LOGIN_FAILED',
  '2020-01-02 konnector-3 OK',

  '2020-01-01 konnector-4 OK manual',
  '2020-01-02 konnector-4 LOGIN_FAILED manual',

  '2020-01-01 konnector-5 VENDOR_DOWN',
  '2020-01-01 konnector-5 LOGIN_FAILED',

  '2020-01-01 konnector-6 LOGIN_FAILED',
  '2020-01-02 konnector-6 OK',
  '2020-01-03 konnector-6 LOGIN_FAILED',

  '2020-01-01 konnector-7 OK',
  '2020-01-02 konnector-7 LOGIN_FAILED',
  '2020-01-03 konnector-7 VENDOR_DOWN',
  '2020-01-04 konnector-7 USER_ACTION_NEEDED',

  '2020-01-01 konnector-8 OK',
  '2020-01-02 konnector-8 USER_ACTION_NEEDED',
  '2020-01-03 konnector-8 LOGIN_FAILED'
]

const expectedResults = [
  'konnector-1 sent',
  'konnector-2 sent',
  'konnector-3 current-state-is-not-errored',
  'konnector-4 manual-job',
  'konnector-5 never-been-in-success',
  'konnector-6 sent',
  'konnector-7 sent',
  'konnector-8 last-failure-already-notified'
]

const ONE_DAY = 1000 * 60 * 60 * 24 // ms * s * min * hours

/**
 * Makes fake responses from the events
 * Allows to express the tests more easily
 */
const makeResponsesFromEvents = () => {
  // Stores the antepenultimate state of the trigger
  const triggerSettingsStatesById = {}

  const triggersById = {}
  const jobsById = {}
  let jobIndex = 1

  for (let event of events) {
    const [date, konnectorSlug, state, manual] = event.split(' ')
    const jobId = `job-${jobIndex++}`
    const triggerId = konnectorSlug.replace('konnector', 'trigger')
    const trigger = {
      _id: triggerId,
      attributes: {
        worker: 'konnector'
      },
      message: {
        konnector: konnectorSlug
      }
    }
    const stateUpdate = {
      status: state === 'OK' ? 'success' : 'errored',
      last_executed_job_id: jobId
    }
    if (state == 'OK') {
      stateUpdate.last_successful_job_id = jobId
      stateUpdate.last_success = date
    } else {
      stateUpdate.last_error = state
      stateUpdate.last_failed_job_id = jobId
      stateUpdate.last_failure = date
    }

    trigger.current_state = Object.assign(
      {},
      triggersById[trigger._id] ? triggersById[trigger._id].current_state : {},
      stateUpdate
    )

    // Store the antepenultimate state in settings
    if (triggersById[trigger._id]) {
      triggerSettingsStatesById[trigger._id] =
        triggersById[trigger._id].current_state
    }

    jobsById[jobId] = {
      data: { manual_execution: Boolean(manual) }
    }

    triggersById[trigger._id] = trigger
  }

  return {
    triggers: {
      data: Object.values(triggersById)
    },
    settings: {
      data: {
        triggerStates: triggerSettingsStatesById
      }
    },
    jobs: jobsById
  }
}

const {
  settings: mockSettingsResponse,
  triggers: mockTriggersResponse,
  jobs: mockJobResponse
} = makeResponsesFromEvents(events)

describe('job notifications service', () => {
  const setup = ({ triggersResponse, settingsResponse, jobsResponse } = {}) => {
    const client = new CozyClient({})
    client.query = jest.fn(async queryDef => {
      const { doctype, id } = queryDef
      if (doctype === 'io.cozy.triggers') {
        return triggersResponse || mockTriggersResponse
      } else if (doctype === 'io.cozy.bank.settings') {
        return settingsResponse || mockSettingsResponse
      } else if (doctype === 'io.cozy.jobs' && id) {
        return jobsResponse ? jobsResponse[id] : mockJobResponse[id]
      } else {
        throw new Error(`No mock for queryDef ${queryDef}`)
      }
    })
    client.save = jest.fn()
    client.stackClient.fetchJSON = jest
      .fn()
      .mockImplementation((verb, route) => {
        if (verb === 'GET' && /\/registry\/konnector-.*/.exec(route)) {
          return { latest_version: { manifest: { categories: ['banking'] } } }
        } else if (verb === 'POST' && route === '/notifications') {
          return {}
        } else {
          throw new Error(`Mock stackClient does not support ${verb}:${route}`)
        }
      })
    client.stackClient.uri = 'http://cozy.tools:8080'
    return { client }
  }

  beforeEach(() => {
    sendNotification.mockClear()
  })

  const expectTriggerStatesToHaveBeenSaved = client => {
    const saveCalls = client.save.mock.calls
    const triggerStatesDoc = saveCalls[saveCalls.length - 1][0]

    expect(Object.keys(triggerStatesDoc.triggerStates)).toEqual(
      mockTriggersResponse.data.map(x => x._id)
    )
  }

  it('should not send notifications when no trigger state has been saved yet', async () => {
    const { client } = setup({
      settingsResponse: {
        data: null
      }
    })
    await sendTriggerNotifications(client)
    expect(client.query).toHaveBeenCalledWith(
      expect.objectContaining({
        doctype: 'io.cozy.triggers',
        selector: {
          worker: 'konnector'
        }
      })
    )
    expect(sendNotification).not.toHaveBeenCalled()
    expectTriggerStatesToHaveBeenSaved(client)
  })

  it('should send a notification with the right content and save trigger states', async () => {
    const { client } = setup()
    await sendTriggerNotifications(client)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(sendNotification).toHaveBeenCalledWith(client, expect.any(Object))

    const calls = client.stackClient.fetchJSON.mock.calls
    const payload = calls[calls.length - 1][2]
    const notifAttributes = payload.data.attributes
    const at = new Date(notifAttributes.at)
    const now = new Date()
    // test that the notification in less than a day
    const interval = +at - now
    expect(interval).toBeGreaterThan(0)
    expect(interval).toBeLessThan(86400000)

    const notifSlugs = matchAll(notifAttributes.content, /konnector-\d+/)

    const expectedResultsData = expectedResults.map(x => {
      const [konnectorSlug, state] = x.split(' ')
      return { konnectorSlug, state }
    })
    expect(notifSlugs).toEqual(
      expectedResultsData
        .filter(x => x.state === 'sent')
        .map(x => x.konnectorSlug)
    )

    for (let result of expectedResultsData) {
      if (result.state === 'sent') {
        continue
      }
      expect(logger).toHaveBeenCalledWith(
        'info',
        `Will not notify trigger for ${result.konnectorSlug} because ${result.state}`
      )
    }
    expectTriggerStatesToHaveBeenSaved(client)
  })
})

describe('destroyObsoleteTrigger', () => {
  const client = createMockClient({})
  client.destroy = jest.fn()

  it("should not destroy trigger if trigger hasn't obsolete arguments date", async () => {
    await destroyObsoleteTrigger(client, {})
    expect(client.destroy).not.toHaveBeenCalled()

    await destroyObsoleteTrigger(client, {
      arguments: ''
    })
    expect(client.destroy).not.toHaveBeenCalled()

    const notObsoleteDate = new Date(Date.now() + ONE_DAY)
    await destroyObsoleteTrigger(client, {
      arguments: notObsoleteDate
    })
    expect(client.destroy).not.toHaveBeenCalled()
  })

  it('should not destroy trigger if trigger type is not @at even if it has obsolete arguments date', async () => {
    const obsoleteDate = new Date(Date.now() - ONE_DAY)

    await destroyObsoleteTrigger(client, {
      type: '@cron',
      arguments: obsoleteDate
    })
    expect(client.destroy).not.toHaveBeenCalled()
  })

  it('should destroy trigger if trigger type @at has obsolete arguments date', async () => {
    const obsoleteDate = new Date(Date.now() - ONE_DAY)

    await destroyObsoleteTrigger(client, {
      type: '@at',
      arguments: obsoleteDate
    })
    expect(client.destroy).toHaveBeenCalled()
  })
})
