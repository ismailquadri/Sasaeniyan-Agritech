import { expect, test } from 'vitest'
import { naira, formatNaira } from './money'

test('naira converts to kobo', () => {
  expect(naira(6200)).toBe(620000)
})

test('formatNaira formats kobo', () => {
  expect(formatNaira(620000)).toBe('₦6,200')
})
