import startCase from 'lodash/startCase'
import maxBy from 'lodash/maxBy'
import groupBy from 'lodash/groupBy'

export const prettyLabel = label => {
  return label ? startCase(label.toLowerCase()) : ''
}

const mostFrequent = (iterable, fn) => {
  const groups = groupBy(iterable, fn)
  return maxBy(Object.entries(groups), ([, ops]) => ops.length)[0]
}

export const getAutomaticLabelFromBundle = bundle =>
  mostFrequent(bundle.ops, op => op.label)

export const getLabel = bundle => {
  if (bundle.manualLabel) {
    return bundle.manualLabel
  } else {
    return prettyLabel(bundle.automaticLabel)
  }
}

export const getCategories = bundle => {
  return bundle.categoryId.split(' / ')
}
