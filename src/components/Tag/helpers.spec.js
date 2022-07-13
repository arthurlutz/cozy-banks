import { createMockClient } from 'cozy-client'

import { pushAndAddTag, makeTagsToRemove, makeTagsToAdd } from './helpers'

const client = createMockClient({})
client.save = jest.fn(x => ({ data: x }))
const addTag = jest.fn()
const toggleBusy = jest.fn()
const onClose = jest.fn()

describe('pushAndAddTag', () => {
  it('should not create the tag if no label', async () => {
    await pushAndAddTag({ label: null, client, addTag, toggleBusy, onClose })

    expect(client.save).not.toHaveBeenCalled()
    expect(toggleBusy).not.toHaveBeenCalled()
    expect(addTag).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should create the tag if the label is not empty', async () => {
    await pushAndAddTag({
      label: 'foo',
      client,
      toggleBusy,
      addTag,
      onClose
    })

    expect(client.save).toHaveBeenCalled()
    expect(toggleBusy).toHaveBeenCalled()
    expect(addTag).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('makeTagsToAdd', () => {
  it('should return tags to add', () => {
    const transactionTags = [{ _id: 'id01', label: 'label01' }]
    const selectedTagIds = ['id01', 'id02', 'id03']
    const allTags = [
      { _id: 'id01', label: 'label01', transactions: [] },
      { _id: 'id02', label: 'label02', transactions: [] },
      { _id: 'id03', label: 'label03', transactions: [] }
    ]

    const res = makeTagsToAdd({ transactionTags, selectedTagIds, allTags })

    expect(res).toStrictEqual([
      { _id: 'id02', label: 'label02', transactions: [] },
      { _id: 'id03', label: 'label03', transactions: [] }
    ])
  })
})

describe('makeTagsToRemove', () => {
  it('should return tags to remove', () => {
    const transactionTags = [
      { _id: 'id01', label: 'label01' },
      { _id: 'id02', label: 'label02' },
      { _id: 'id03', label: 'label03' }
    ]
    const selectedTagIds = ['id01']
    const allTags = [
      { _id: 'id01', label: 'label01', transactions: [] },
      { _id: 'id02', label: 'label02', transactions: [] },
      { _id: 'id03', label: 'label03', transactions: [] }
    ]

    const res = makeTagsToRemove({ transactionTags, selectedTagIds, allTags })

    expect(res).toStrictEqual([
      { _id: 'id02', label: 'label02', transactions: [] },
      { _id: 'id03', label: 'label03', transactions: [] }
    ])
  })
})
