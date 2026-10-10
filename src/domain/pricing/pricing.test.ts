import { expect, test } from 'vitest'
import { fairPrice, gradeFactor, priceBreakdown } from './pricing'

test('grade A full index', () => {
  expect(gradeFactor('A')).toBe(1)
})

test('clamps to band min', () => {
  // index*factor below band → clamp up to band min
  expect(fairPrice({ indexPrice: 300000, grade: 'A', bandMin: 500000, bandMax: 900000 })).toBe(500000)
})

test('clamps to band max', () => {
  expect(fairPrice({ indexPrice: 1200000, grade: 'A', bandMin: 500000, bandMax: 900000 })).toBe(900000)
})

test('grade B discounts', () => {
  expect(fairPrice({ indexPrice: 700000, grade: 'B', bandMin: 400000, bandMax: 900000 })).toBe(595000)
})

test('breakdown exposes inputs and result', () => {
  const b = priceBreakdown({ indexPrice: 700000, grade: 'B', bandMin: 400000, bandMax: 900000 })
  expect(b).toEqual({ index: 700000, grade: 'B', factor: 0.85, band: [400000, 900000], price: 595000 })
})
