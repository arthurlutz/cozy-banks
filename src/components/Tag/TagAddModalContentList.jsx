import React, { Fragment, useState, useEffect, useRef } from 'react'
import debounce from 'lodash/debounce'
import { useDebounce } from 'rooks'

import { useI18n } from 'cozy-ui/transpiled/react/I18n'
import List from 'cozy-ui/transpiled/react/MuiCozyTheme/List'
import ListItem from 'cozy-ui/transpiled/react/MuiCozyTheme/ListItem'
import ListItemIcon from 'cozy-ui/transpiled/react/MuiCozyTheme/ListItemIcon'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import Icon from 'cozy-ui/transpiled/react/Icon'
import PlusIcon from 'cozy-ui/transpiled/react/Icons/Plus'
import Divider from 'cozy-ui/transpiled/react/MuiCozyTheme/Divider'
import Checkbox from 'cozy-ui/transpiled/react/Checkbox'

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

const debouncedAddTag = debounce(addTag, 500)
const debouncedRemoveTag = debounce(removeTag, 500)

const Item = React.memo(function Item({ tag, checked, onClick }) {
  const { t } = useI18n()

  return (
    <ListItem button onClick={() => onClick(tag)}>
      <ListItemIcon>
        <Checkbox checked={checked} />
      </ListItemIcon>
      <ListItemText
        primary={tag.label}
        secondary={t('Tag.transactions', {
          smart_count: countTransactions(tag)
        })}
      />
    </ListItem>
  )
})

const TagAddModalContentList = ({
  transaction,
  tags,
  toggleAddNewTagModal,
  selectedTagIds,
  onClick
}) => {
  const { t } = useI18n()

  const [exec, setExec] = useState(false)
  const debouncedSetExec = useDebounce(setExec, 500)

  // const selectedTagIds = getTransactionTagsIds(transaction)

  // useEffect(() => {
  //   if (exec) {
  //     console.info('exec !!')
  //     setExec(false)

  //     const tagsToRemove = makeTagsToRemove({
  //       transactionTags: getTransactionTags(transaction),
  //       selectedTagIds,
  //       allTags: tags
  //     })
  //     const tagsToAdd = makeTagsToAdd({
  //       transactionTags: getTransactionTags(transaction),
  //       selectedTagIds,
  //       allTags: tags
  //     })

  //     if (tagsToRemove.length > 0) {
  //       removeTag(transaction, tagsToRemove)
  //     }
  //     if (tagsToAdd.length > 0) {
  //       addTag(transaction, tagsToAdd)
  //     }
  //   }
  // }, [selectedTagIds, transaction, tags, exec])

  // statut initial

  // quand on clique, on change le statut

  // après 300ms, on modifie la transaction avec le statut actuel
  // => suppression et ajout des

  return (
    <List>
      {tags.map((tag, index) => (
        <>
          <Item
            key={`${tag.label} ${index}`}
            tag={tag}
            checked={isTagSelected(selectedTagIds, tag)}
            onClick={onClick}
          />
          <Divider component="li" variant="inset" />
        </>
      ))}
      <ListItem button onClick={toggleAddNewTagModal}>
        <ListItemIcon>
          <Icon icon={PlusIcon} />
        </ListItemIcon>
        <ListItemText primary={t('Tag.new-tag')} />
      </ListItem>
    </List>
  )
}

export default TagAddModalContentList
