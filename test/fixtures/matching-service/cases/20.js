module.exports = {
  description: 'bill with own amount deltas',
  bills: [
    {
      _id: 'b1',
      amount: 30,
      date: '2019-07-31T00:00:00.000Z',
      vendor: 'pouet',
      matchingCriterias: {
        amountLowerDelta: 2
      }
    }
  ],
  operations: [
    {
      _id: 'op1',
      date: '2019-07-31T12:00:00.000Z',
      label: 'pouet',
      amount: -32
    }
  ],
  expectedResult: {
    b1: {
      debitOperation: 'op1',
      creditOperation: undefined
    }
  }
}
