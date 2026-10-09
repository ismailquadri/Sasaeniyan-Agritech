import { expect, test } from 'vitest'
import { maxAdvance, netPayout } from './finance'

test('advance capped at 40% of planned value', () => {
  expect(maxAdvance({ plannedVolume: 20, bandMin: 500000, rate: 0.4 })).toBe(4000000)
})

test('net payout subtracts advance, fee, commission', () => {
  expect(
    netPayout({ saleValue: 10800000, advance: 2200000, feeRate: 0.03, commissionRate: 0.02 }),
  ).toEqual({ platformFee: 324000, agentCommission: 216000, advanceNetted: 2200000, farmerPayout: 8060000 })
})

test('net payout with no advance', () => {
  expect(
    netPayout({ saleValue: 1000000, advance: 0, feeRate: 0.03, commissionRate: 0.02 }),
  ).toEqual({ platformFee: 30000, agentCommission: 20000, advanceNetted: 0, farmerPayout: 950000 })
})
