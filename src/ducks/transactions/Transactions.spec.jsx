/* global mount */

import React from 'react'
import { render, fireEvent, wait } from '@testing-library/react'
import { within } from '@testing-library/dom'

import flag from 'cozy-flags'
import useBreakpoints from 'cozy-ui/transpiled/react/hooks/useBreakpoints'
import Alerter from 'cozy-ui/transpiled/react/Alerter'
import { createMockClient } from 'cozy-client/dist/mock'

import data from 'test/fixtures'
import AppLike from 'test/AppLike'

import TransactionPageErrors from 'ducks/transactions/TransactionPageErrors'
import { TransactionsDumb, sortByDate } from './Transactions'

// No need to test this here
jest.mock('ducks/transactions/TransactionPageErrors', () => () => null)

jest.mock('cozy-ui/transpiled/react/hooks/useBreakpoints', () => ({
  __esModule: true,
  default: jest.fn(),
  BreakpointsProvider: ({ children }) => children
}))

jest.mock('cozy-ui/transpiled/react/Alerter', () => ({
  success: jest.fn()
}))

// Mock useVisible so that intersection observer is not used
// in test, useVisible is static here
jest.mock('hooks/useVisible', () => {
  return initialState => {
    return [null, initialState]
  }
})

const mockTransactions = data['io.cozy.bank.operations'].map((x, i) => ({
  _id: `transaction-id-${i++}`,
  ...x
}))

describe('Transactions', () => {
  const setup = ({ showTriggerErrors, renderFn }) => {
    useBreakpoints.mockReturnValue({ isDesktop: false })

    const Wrapper = ({ transactions = mockTransactions }) => {
      return (
        <AppLike>
          <TransactionsDumb
            breakpoints={{ isDesktop: false }}
            transactions={transactions}
            showTriggerErrors={showTriggerErrors}
            TransactionSections={() => <div />}
          />
        </AppLike>
      )
    }
    const root = renderFn(<Wrapper />)

    return { root, transactions: mockTransactions }
  }

  describe('when showTriggerErrors is false', () => {
    it('should not show transaction errors', () => {
      const { root } = setup({ showTriggerErrors: false, renderFn: mount })
      expect(root.find(TransactionPageErrors).length).toBe(0)
    })
  })

  describe('when showTriggerErrors is true', () => {
    it('should show transaction errors', () => {
      const { root } = setup({ showTriggerErrors: true, renderFn: mount })
      expect(root.find(TransactionPageErrors).length).toBe(1)
    })
  })

  it('should sort transactions from props on mount and on update', () => {
    const { root, transactions } = setup({
      isOnSubcategory: false,
      renderFn: mount
    })

    const instance = root.find(TransactionsDumb).instance()
    expect(instance.transactions).toEqual(sortByDate(transactions))

    const slicedTransactions = transactions.slice(0, 10)
    root.setProps({ transactions: slicedTransactions })

    const instance2 = root.find(TransactionsDumb).instance()
    expect(instance2.transactions).toEqual(sortByDate(slicedTransactions))
  })
})

describe('Interactions', () => {
  beforeAll(() => {
    flag('banks.selectionMode.enabled', true)
  })

  afterAll(() => {
    flag('banks.selectionMode.enabled', undefined)
  })

  beforeEach(() => {
    Alerter.success.mockReset()
  })

  const setup = ({
    isDesktop = false,
    transactions = mockTransactions
  } = {}) => {
    const client = createMockClient({
      queries: {
        // The transaction modal gets its transactions through cozy-client
        // store. This is why the transactions should be in there.
        fakeTransactions: {
          data: transactions,
          doctype: 'io.cozy.bank.operations'
        }
      }
    })
    client.save.mockImplementation(doc => ({ data: doc }))
    useBreakpoints.mockReturnValue({ isDesktop })
    const router = { location: 'fakeLocation' }
    const root = render(
      <AppLike client={client} router={router}>
        <TransactionsDumb
          breakpoints={{ isDesktop: false }}
          transactions={transactions}
          showTriggerErrors={false}
          emptySelection={() => null}
        />
      </AppLike>
    )

    return { root, client }
  }

  describe('Transaction modal', () => {
    it('should show transaction modal on click on label', async () => {
      const { root } = setup({
        isDesktop: true,
        transactions: mockTransactions.slice(0, 1)
      })
      const label = root.getByText('Remboursement Pret Lcl')
      expect(root.queryByRole('dialog')).toBeFalsy()
      fireEvent.click(label)
      const dialog = root.getByRole('dialog')
      expect(dialog).toBeTruthy()
      expect(within(dialog).getByText('Assigned to Aug 2017'))
    })
  })

  describe('SelectionBar', () => {
    it('should show selection bar and open category modal on desktop', async () => {
      const { root, client } = setup({ isDesktop: true })
      const { getByText, getByTestId, queryByTestId } = root

      fireEvent.click(getByTestId('TransactionRow-checkbox-maintenance'))
      expect(queryByTestId('selectionBar')).toBeTruthy()
      expect(queryByTestId('selectionBar-count').textContent).toBe(
        '1 item selected'
      )

      // should remove the selection bar
      fireEvent.click(getByText('Maintenance'))
      expect(queryByTestId('selectionBar')).toBeFalsy()

      // should show 2 transactions selected
      fireEvent.click(getByTestId('TransactionRow-checkbox-maintenance'))
      expect(queryByTestId('selectionBar')).toBeTruthy()
      fireEvent.click(getByText('Franprix St Lazare Pr'))
      expect(queryByTestId('selectionBar-count').textContent).toBe(
        '2 items selected'
      )

      // should unselected transaction
      fireEvent.click(getByText('Franprix St Lazare Pr'))
      expect(queryByTestId('selectionBar-count').textContent).toBe(
        '1 item selected'
      )
      fireEvent.click(getByText('Franprix St Lazare Pr'))
      expect(queryByTestId('selectionBar-count').textContent).toBe(
        '2 items selected'
      )

      // selecting a category
      fireEvent.click(getByText('Categorize'))
      fireEvent.click(getByText('Everyday life'))
      fireEvent.click(getByText('Supermarket'))

      // should remove the selection bar and show a success alert
      expect(queryByTestId('selectionBar')).toBeFalsy()
      await wait(() => expect(client.save).toHaveBeenCalledTimes(2))
      expect(Alerter.success).toHaveBeenCalledWith(
        '2 operations have been recategorized'
      )
    })
  })
})
