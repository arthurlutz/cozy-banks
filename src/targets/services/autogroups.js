import argparse from 'argparse'
import logger from 'cozy-logger'
import omit from 'lodash/omit'
import keyBy from 'lodash/keyBy'
import { runService } from './service'
import difference from 'lodash/difference'
import { updateSettings, fetchSettings } from 'ducks/settings/helpers'

import { GROUP_DOCTYPE, ACCOUNT_DOCTYPE } from 'doctypes'
import {
  buildAutoGroups,
  isAutoGroup,
  getGroupAccountType
} from 'ducks/groups/helpers'

const log = logger.namespace('auto-groups')

const mergeSets = (s1, s2) => {
  const s3 = new Set()
  s1.forEach(item => s3.add(item))
  s2.forEach(item => s3.add(item))
  return s3
}

const createAutoGroups = async ({ client }) => {
  const settings = await fetchSettings(client)
  const groups = await client.queryAll(client.all(GROUP_DOCTYPE))
  const accounts = await client.queryAll(client.all(ACCOUNT_DOCTYPE))

  const alreadyProcessed = new Set(settings.autogroups.processedAccounts)

  log(
    'info',
    `Number of accounts already processed by autogroups: ${
      alreadyProcessed.size
    }`
  )
  const accountsToProcess = accounts.filter(
    account => !alreadyProcessed.has(account._id)
  )

  if (accountsToProcess.length === 0) {
    log('info', 'No accounts to process for autogroups, bailing out.')
    return
  }

  const groupsByAccountType = keyBy(
    groups.filter(isAutoGroup),
    getGroupAccountType
  )
  const autoGroups = buildAutoGroups(accountsToProcess, {
    virtual: false,
    client
  })

  for (const autoGroup of autoGroups) {
    const { accountType } = autoGroup
    const existing = groupsByAccountType[accountType]
    if (existing) {
      log(
        'info',
        `Automatic group for ${accountType} accounts is already created`
      )

      const newAccounts = difference(autoGroup.accounts.raw, existing.accounts)
      if (newAccounts.length > 0) {
        log('info', `Saving ${newAccounts.length} to group ${accountType}`)

        await client.save({
          ...autoGroup,
          accounts: [...existing.accounts, ...autoGroup.accounts.raw],
          _rev: existing._rev,
          _id: existing._id
        })
      } else {
        log('info', `Nothing changed for group ${accountType}`)
      }
    } else {
      log(
        'info',
        `Creating automatic group for ${accountType} accounts (${
          autoGroup.accounts.target.accounts.length
        } account)`
      )
      await client.save(autoGroup)
    }
  }

  const processedAccounts = new Set(accountsToProcess.map(x => x._id))

  settings.autogroups.processedAccounts = Array.from(
    mergeSets(alreadyProcessed, processedAccounts)
  )
  await updateSettings(client, settings)
}

const listAutoGroups = async ({ client }) => {
  const groups = await client.queryAll(client.all(GROUP_DOCTYPE))

  const autogroups = groups.filter(isAutoGroup)

  log(
    'info',
    `${autogroups.length} autogroups (${groups.length} groups in total)`
  )
  for (const group of autogroups) {
    log('info', `${group.label} (_id: ${group._id})`)
    for (const account of group.accounts) {
      log('info', `  ${account}`)
    }
  }
}

const purgeAutoGroups = async ({ client }) => {
  const { data: groups } = await client.query(
    client.all(GROUP_DOCTYPE, { limit: null })
  )
  let autogroups = groups.filter(isAutoGroup)

  autogroups = autogroups.map(x => omit(x, '_type'))
  const col = client.collection(GROUP_DOCTYPE)
  await col.destroyAll(autogroups)
  log('info', `Destroyed ${autogroups.length} autogroups`)
}

const autoGroupsMain = async () => {
  const parser = argparse.ArgumentParser({
    description: 'Service to create groups based on bank account types'
  })
  parser.addArgument('mode', {
    optional: true,
    nargs: '?',
    choices: ['list', 'purge', 'create']
  })
  const args = parser.parseArgs()
  if (args.mode === 'list') {
    await runService(listAutoGroups)
  } else if (args.mode == 'purge') {
    await runService(purgeAutoGroups)
  } else if (args.mode == 'create' || !args.mode) {
    await runService(createAutoGroups)
  }
}

autoGroupsMain()
