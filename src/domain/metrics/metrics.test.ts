import { expect, test } from 'vitest'
import { incomeUplift, revenueSplit } from './metrics'

test('income uplift is relative gain over middleman price', () => {
  expect(incomeUplift({ ourPrice: 600000, middlemanPrice: 300000 })).toBe(1) // +100%
})

test('income uplift is 0 when prices match', () => {
  expect(incomeUplift({ ourPrice: 500000, middlemanPrice: 500000 })).toBe(0)
})

test('income uplift guards divide-by-zero', () => {
  expect(incomeUplift({ ourPrice: 500000, middlemanPrice: 0 })).toBe(0)
})

test('revenue split sums platform take and finance spread', () => {
  expect(revenueSplit({ saleValue: 10000000, feeRate: 0.03, financeSpread: 150000 })).toEqual({
    platformFee: 300000,
    financeSpread: 150000,
    total: 450000,
  })
})
