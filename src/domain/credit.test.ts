import { describe, it, expect } from 'vitest'
import { creditLevel, advanceRateFor } from './credit'

describe('credit levels', () => {
  it('maps score to level', () => {
    expect(creditLevel(0)).toBe(1)
    expect(creditLevel(8)).toBe(1)
    expect(creditLevel(10)).toBe(2)
    expect(creditLevel(29)).toBe(2)
    expect(creditLevel(30)).toBe(3)
  })

  it('maps level to advance rate', () => {
    expect(advanceRateFor(0)).toBe(0.4)
    expect(advanceRateFor(15)).toBe(0.5)
    expect(advanceRateFor(45)).toBe(0.6)
  })
})
