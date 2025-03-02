import keyBy from 'lodash/keyBy'
import merge from 'lodash/merge'

import log from 'cozy-logger'
import { toText } from 'cozy-notifications'

import { Bill } from 'models'
import {
  treatedByFormat,
  prepareTransactions,
  getCurrentDate,
  getReimbursementBillIds,
  makeAtAttributes
} from 'ducks/notifications/helpers'
import template from './template.hbs'
import NotificationView from 'ducks/notifications/BaseNotificationView'
import { isHealthExpense } from 'ducks/categories/helpers'

const ACCOUNT_SEL = '.js-account'
const DATE_SEL = '.js-date'
const TRANSACTION_SEL = '.js-transaction'

const customToText = cozyHTMLEmail => {
  const getTextTransactionRow = $row =>
    $row
      .find('td')
      .map((i, td) => $row.find(td).text().trim())
      .toArray()
      .join(' ')
      .replace(/\n/g, '')
      .replace(' €', '€')
      .trim()

  const getContent = $ =>
    $([ACCOUNT_SEL, DATE_SEL, TRANSACTION_SEL].join(', '))
      .toArray()
      .map(node => {
        const $node = $(node)
        if ($node.is(ACCOUNT_SEL)) {
          return '\n\n### ' + $node.text()
        } else if ($node.is(DATE_SEL)) {
          return '\n' + $node.text() + '\n'
        } else if ($node.is(TRANSACTION_SEL)) {
          return '- ' + getTextTransactionRow($node)
        }
      })
      .join('\n')
  return toText(cozyHTMLEmail, getContent)
}

const hasReimbursements = transaction =>
  isHealthExpense(transaction) &&
  transaction.reimbursements &&
  transaction.reimbursements.length > 0

class HealthBillLinked extends NotificationView {
  async fetchData() {
    const { accounts, transactions } = this.data
    const transactionsWithReimbursements =
      transactions.filter(hasReimbursements)
    const billIds = getReimbursementBillIds(transactions)
    const bills = await Bill.getAll(billIds)
    return {
      transactions: transactionsWithReimbursements,
      accounts,
      bills
    }
  }

  async buildData() {
    const { accounts, transactions, bills } = await this.fetchData()
    if (transactions.length === 0) {
      log('info', 'HealthBillLinked: no transactions with reimbursements')
      return
    }

    const accountsById = keyBy(accounts, '_id')
    const billsById = keyBy(bills, '_id')
    const transactionsByAccounts = prepareTransactions(transactions)

    return {
      accounts: accountsById,
      bills,
      transactions,
      byAccounts: transactionsByAccounts,
      billsById: billsById,
      date: getCurrentDate(),
      ...this.urls
    }
  }

  getExtraAttributes() {
    return merge(super.getExtraAttributes(), {
      data: {
        route: '/transactions'
      },
      at: makeAtAttributes('HealthBillLinked')
    })
  }

  getTitle() {
    return this.t(
      `Notifications.when-health-bill-linked.notification.content.title`
    )
  }

  getPushContent(templateData) {
    const { transactions, billsById } = templateData
    const [transaction] = transactions
    const vendors = treatedByFormat(transaction.reimbursements, billsById)

    return `${transaction.label} ${this.t(
      `Notifications.when-health-bill-linked.notification.content.treated-by`
    )} ${vendors}`
  }
}

HealthBillLinked.preferredChannels = ['mobile', 'mail']
HealthBillLinked.category = 'health-bill-linked'
HealthBillLinked.toText = customToText
HealthBillLinked.template = template
HealthBillLinked.settingKey = 'healthBillLinked'

export default HealthBillLinked
