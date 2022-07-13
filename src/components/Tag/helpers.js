import { TAGS_DOCTYPE } from 'doctypes'
import useDocument from 'components/useDocument'

export const pushAndAddTag = async ({
  client,
  transaction,
  label,
  addTag,
  toggleBusy,
  onClose
}) => {
  if (!label) return

  toggleBusy()

  const { data: tag } = await client.save({
    _type: TAGS_DOCTYPE,
    label
  })

  // addTag(transaction, tag)

  onClose()
}

export const isTagSelected = (selectedTagIds, tag) => {
  return selectedTagIds.some(selectedTagsId => selectedTagsId === tag._id)
}

const isTagIdInTags = (tagId, tags) => {
  return tags.some(tag => tagId === tag._id)
}

export const makeTagsToAdd = ({ transactionTags, selectedTagIds, allTags }) => {
  const tagIdsToAdd = selectedTagIds.filter(
    selectedTagId => !isTagIdInTags(selectedTagId, transactionTags)
  )

  return tagIdsToAdd.map(tagId => allTags.find(tag => tag._id === tagId))
}

export const makeTagsToRemove = ({
  transactionTags,
  selectedTagIds,
  allTags
}) => {
  const tagsToRemove = transactionTags.filter(
    transactionTag => !isTagSelected(selectedTagIds, transactionTag)
  )

  return tagsToRemove.map(tagToRemove =>
    allTags.find(tag => tag._id === tagToRemove._id)
  )
}

export const countTransactions = tag => {
  return tag.transactions.count
}
