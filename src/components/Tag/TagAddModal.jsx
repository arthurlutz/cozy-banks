import React, { useState, useEffect } from 'react'

import { useQueryAll, isQueryLoading } from 'cozy-client'
import { useI18n } from 'cozy-ui/transpiled/react/I18n'
import Spinner from 'cozy-ui/transpiled/react/Spinner'

import { tagsConn } from 'doctypes'
import RawContentDialog from 'components/RawContentDialog'
import TagAddModalContent from 'components/Tag/TagAddModalContent'
import TagAddNewTagModal from 'components/Tag/TagAddNewTagModal'
import {
  addTag,
  removeTag,
  getTransactionTags,
  getTransactionTagsIds
} from 'ducks/transactions/helpers'
import {
  isTagSelected,
  makeTagsToRemove,
  makeTagsToAdd,
  countTransactions
} from 'components/Tag/helpers'

const TagAddModal = ({ transaction, onClose }) => {
  const { t } = useI18n()
  const [showAddNewTagModal, setShowAddNewTagModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const toggleAddNewTagModal = () => setShowAddNewTagModal(prev => !prev)
  const [selectedTagIds, setSelectedTagIds] = useState(() =>
    getTransactionTagsIds(transaction)
  )

  const { data: tags, ...tagsQueryRest } = useQueryAll(tagsConn.query, tagsConn)
  const isLoading = isQueryLoading(tagsQueryRest) || tagsQueryRest.hasMore

  useEffect(() => {
    setSelectedTagIds(getTransactionTagsIds(transaction))
  }, [transaction])

  const handleClick = tag => {
    if (selectedTagIds.some(tagId => tagId === tag._id)) {
      setSelectedTagIds(prev => prev.filter(id => id !== tag._id))
    } else if (selectedTagIds.length < 5) {
      setSelectedTagIds(prev => [...prev, tag._id])
    }
  }

  const handleClose = () => {
    setIsSaving(true)
    const tagsToRemove = makeTagsToRemove({
      transactionTags: getTransactionTags(transaction),
      selectedTagIds,
      allTags: tags
    })
    const tagsToAdd = makeTagsToAdd({
      transactionTags: getTransactionTags(transaction),
      selectedTagIds,
      allTags: tags
    })

    if (tagsToRemove.length > 0) {
      removeTag(transaction, tagsToRemove)
    }
    if (tagsToAdd.length > 0) {
      addTag(transaction, tagsToAdd)
    }

    onClose()
  }

  console.info(' ')
  console.info('isSaving :', isSaving)
  console.info(' ')

  return (
    <>
      <RawContentDialog
        size="small"
        open
        onClose={handleClose}
        title={t('Tag.add-tag')}
        content={
          isSaving || isLoading ? (
            <Spinner
              size="xlarge"
              className="u-flex u-flex-justify-center u-mv-1"
            />
          ) : (
            <TagAddModalContent
              transaction={transaction}
              toggleAddNewTagModal={toggleAddNewTagModal}
              selectedTagIds={selectedTagIds}
              tags={tags}
              onClick={handleClick}
            />
          )
        }
      />
      {showAddNewTagModal && (
        <TagAddNewTagModal
          transaction={transaction}
          onClose={toggleAddNewTagModal}
        />
      )}
    </>
  )
}

export default TagAddModal
