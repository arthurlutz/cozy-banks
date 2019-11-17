import React from 'react'
import { updateTransactionCategory } from 'ducks/transactions/helpers'
import { getCategoryId } from 'ducks/categories/helpers'
import CategoryChoice from 'ducks/categories/CategoryChoice'
import { withClient } from 'cozy-client'

/**
 * Edits a transaction's category through CategoryChoice
 */
const TransactionCategoryEditor = withClient(props => {
  const { client, transaction, beforeUpdate, afterUpdate, onCancel } = props

  const handleSelect = async category => {
    if (beforeUpdate) {
      await beforeUpdate(props)
    }
    await updateTransactionCategory(client, transaction, category)
    if (afterUpdate) {
      await afterUpdate(props)
    }
  }

  const handleCancel = async () => {
    await onCancel(props)
  }

  return (
    <CategoryChoice
      modal={false}
      categoryId={getCategoryId(transaction)}
      onSelect={handleSelect}
      onCancel={handleCancel}
    />
  )
})

export default TransactionCategoryEditor
