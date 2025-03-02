import fromPairs from 'lodash/fromPairs'
import CozyClient, { QueryDefinition, HasManyInPlace, Q } from 'cozy-client'
import subYears from 'date-fns/sub_years'
import format from 'date-fns/format'

// eslint-disable-next-line no-unused-vars
import { Connection } from './types'

export const RECIPIENT_DOCTYPE = 'io.cozy.bank.recipients'
export const ACCOUNT_DOCTYPE = 'io.cozy.bank.accounts'
export const GROUP_DOCTYPE = 'io.cozy.bank.groups'
export const TRANSACTION_DOCTYPE = 'io.cozy.bank.operations'
export const SETTINGS_DOCTYPE = 'io.cozy.bank.settings'
export const BILLS_DOCTYPE = 'io.cozy.bills'
export const TRIGGER_DOCTYPE = 'io.cozy.triggers'
export const JOBS_DOCTYPE = 'io.cozy.jobs'
export const APP_DOCTYPE = 'io.cozy.apps'
export const KONNECTOR_DOCTYPE = 'io.cozy.konnectors'
export const COZY_ACCOUNT_DOCTYPE = 'io.cozy.accounts'
export const PERMISSION_DOCTYPE = 'io.cozy.permissions'
export const BANK_ACCOUNT_STATS_DOCTYPE = 'io.cozy.bank.accounts.stats'
export const CONTACT_DOCTYPE = 'io.cozy.contacts'
export const RECURRENCE_DOCTYPE = 'io.cozy.bank.recurrence'
export const IDENTITIES_DOCTYPE = 'io.cozy.identities'

export const offlineDoctypes = [
  ACCOUNT_DOCTYPE,
  GROUP_DOCTYPE,
  TRANSACTION_DOCTYPE,
  SETTINGS_DOCTYPE,
  BILLS_DOCTYPE,
  CONTACT_DOCTYPE
]

class HasManyBills extends HasManyInPlace {
  get data() {
    return this.raw
      ? this.raw.map(doctypeId => {
          const [doctype, id] = doctypeId.split(':')
          return this.get(doctype, id)
        })
      : []
  }

  /**
   * Query is redefined since the ids are prepended with their doctype.
   * Also does not refetch if documents have already been fetched once.
   */
  static query(doc, client, assoc) {
    const included = doc[assoc.name]
    if (!included || !included.length) {
      return null
    }

    const ids = included.indexOf(':')
      ? included.map(x => x.split(':')[1])
      : included

    const docs = fromPairs(
      ids.map(id => {
        return [id, client.getDocumentFromState(assoc.doctype, id)]
      })
    )

    const missingIds = Object.keys(docs).filter(id => !docs[id])
    if (!missingIds || !missingIds.length) {
      return Object.values(docs)
    } else {
      return new QueryDefinition({ doctype: assoc.doctype, ids: missingIds })
    }
  }
}

export class HasManyReimbursements extends HasManyInPlace {
  get raw() {
    return this.target[this.name]
  }

  get data() {
    return (this.raw || []).map(reimbursement => {
      if (!reimbursement.billId) {
        return reimbursement
      }
      return {
        ...reimbursement,
        bill: this.get('io.cozy.bills', reimbursement.billId.split(':')[1])
      }
    })
  }

  static query(doc, client, assoc) {
    const included = doc[assoc.name]
    if (!included || !included.length) {
      return null
    }
    const missingIds = included
      .map(doc => doc.billId && doc.billId.split(':')[1])
      .filter(Boolean)

    return new QueryDefinition({ doctype: assoc.doctype, ids: missingIds })
  }
}

export const schema = {
  transactions: {
    doctype: TRANSACTION_DOCTYPE,
    attributes: {},
    relationships: {
      account: {
        type: 'belongs-to-in-place',
        doctype: ACCOUNT_DOCTYPE
      },
      recurrence: {
        type: 'has-one',
        doctype: RECURRENCE_DOCTYPE
      },
      bills: {
        type: HasManyBills,
        doctype: BILLS_DOCTYPE
      },
      reimbursements: {
        type: HasManyReimbursements,
        doctype: BILLS_DOCTYPE
      }
    }
  },
  bills: {
    doctype: BILLS_DOCTYPE
  },
  settings: {
    doctype: SETTINGS_DOCTYPE,
    attributes: {},
    relationships: {}
  },
  bankAccounts: {
    doctype: ACCOUNT_DOCTYPE,
    attributes: {},
    relationships: {
      checkingsAccount: {
        type: 'has-one',
        doctype: ACCOUNT_DOCTYPE
      },
      owners: {
        type: 'has-many',
        doctype: CONTACT_DOCTYPE
      },
      connection: {
        type: 'has-one',
        doctype: COZY_ACCOUNT_DOCTYPE
      }
    }
  },
  groups: {
    doctype: GROUP_DOCTYPE,
    attributes: {},
    relationships: {
      accounts: {
        type: HasManyInPlace,
        doctype: ACCOUNT_DOCTYPE
      }
    }
  },
  triggers: {
    doctype: TRIGGER_DOCTYPE,
    attributes: {},
    relationships: {}
  },
  apps: {
    doctype: APP_DOCTYPE,
    attributes: {},
    relationships: {}
  },
  konnectors: {
    doctype: KONNECTOR_DOCTYPE,
    attributes: {},
    relationships: {}
  },
  stats: {
    doctype: BANK_ACCOUNT_STATS_DOCTYPE,
    attributes: {},
    relationships: {
      account: {
        type: 'has-one',
        doctype: ACCOUNT_DOCTYPE
      }
    }
  }
}

export const older30s = CozyClient.fetchPolicies.olderThan(30 * 1000)

export const accountsConn = {
  query: () => Q(ACCOUNT_DOCTYPE).include(['owners', 'connection']),
  as: 'accounts',
  fetchPolicy: older30s
}

export const groupsConn = {
  query: () => Q(GROUP_DOCTYPE),
  as: 'groups',
  fetchPolicy: older30s
}

export const cronKonnectorTriggersConn = {
  query: () =>
    Q(TRIGGER_DOCTYPE).where({
      worker: 'konnector',
      type: '@cron'
    }),
  as: 'triggers'
}

export const transactionsConn = {
  query: () =>
    Q(TRANSACTION_DOCTYPE)
      .UNSAFE_noLimit()
      .include(['bills', 'account', 'reimbursements', 'recurrence']),
  as: 'transactions',
  fetchPolicy: older30s
}

export const makeBalanceTransactionsConn = () => {
  const fromDate = format(subYears(new Date(), 1), 'YYYY-MM-DD')
  return {
    as: 'home/transactions',
    fetchPolicy: older30s,
    query: () =>
      Q(TRANSACTION_DOCTYPE)
        .limitBy(1000)
        .where({
          date: {
            $gt: fromDate
          }
        })
        .sortBy([{ date: 'desc' }])
        .indexFields(['date'])
        .select([
          '_id',
          'date',
          'realisationDate',
          'amount',
          'account',
          'currency',
          'manualCategoryId',
          'cozyCategoryId',
          'cozyCategoryProba',
          'localCategoryId',
          'localCategoryProba',
          'automaticCategoryId',
          'label',
          'reimbursementStatus',
          'reimbursements'
        ])
  }
}

export const appsConn = {
  query: () => Q(APP_DOCTYPE),
  as: 'apps',
  fetchPolicy: older30s
}

export const billsConn = {
  query: () => Q(BILLS_DOCTYPE),
  as: 'bills',
  fetchPolicy: older30s
}

export const settingsConn = {
  query: () => Q(SETTINGS_DOCTYPE),
  as: 'settings',
  fetchPolicy: older30s
}

export const recipientsConn = {
  query: () => Q(RECIPIENT_DOCTYPE),
  as: 'recipients',
  fetchPolicy: older30s
}

export const recurrenceConn = {
  query: () =>
    Q(RECURRENCE_DOCTYPE)
      .where({ _id: { $gt: null }, latestDate: { $gt: null } })
      .sortBy([{ _id: 'desc' }, { latestDate: 'desc' }]),
  as: 'recurrence',
  fetchPolicy: older30s
}

export const myselfConn = {
  query: () => Q('io.cozy.contacts').where({ me: true }),
  as: 'myself',
  fetchPolicy: older30s
}

export const konnectorConn = {
  query: slug => Q(KONNECTOR_DOCTYPE).getById(`${KONNECTOR_DOCTYPE}/${slug}`),
  as: 'konnector'
}
