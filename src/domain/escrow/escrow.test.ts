import { expect, test } from 'vitest'
import { escrowReduce, type EscrowState } from './escrow'

test('none → funded on fund', () => {
  expect(escrowReduce('none', 'fund')).toBe('funded')
})

test('funded → released on release', () => {
  expect(escrowReduce('funded', 'release')).toBe('released')
})

test('cannot release before funding', () => {
  expect(() => escrowReduce('none' as EscrowState, 'release')).toThrow()
})

test('cannot fund twice', () => {
  expect(() => escrowReduce('funded', 'fund')).toThrow()
})

test('cannot act on released', () => {
  expect(() => escrowReduce('released', 'release')).toThrow()
})
