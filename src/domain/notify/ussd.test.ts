import { expect, test } from 'vitest'
import { newSession, ussdStep } from './ussd'

test('sell flow emits ACCEPT_HARVEST on accept', () => {
  let r = ussdStep(newSession('ha'), '1') // menu → sell → choose crop
  expect(r.session.step).toBe('crop')
  r = ussdStep(r.session, '1') // tomato
  expect(r.session.crop).toBe('tomato')
  expect(r.session.step).toBe('baskets')
  r = ussdStep(r.session, '12') // 12 baskets
  expect(r.session.baskets).toBe(12)
  expect(r.session.step).toBe('offer')
  r = ussdStep(r.session, '1') // accept
  expect(r.action).toEqual({ type: 'ACCEPT_HARVEST', crop: 'tomato', baskets: 12 })
  expect(r.session.step).toBe('done')
})

test('empty input on fresh session shows the menu', () => {
  const r = ussdStep(newSession(), '')
  expect(r.session.step).toBe('menu')
  expect(r.prompt).toContain('Sasaeniyan')
})

test('cancel at offer resets to menu', () => {
  let r = ussdStep(newSession(), '1')
  r = ussdStep(r.session, '2') // pepper
  r = ussdStep(r.session, '5')
  r = ussdStep(r.session, '2') // cancel
  expect(r.session.step).toBe('menu')
})

test('invalid menu input keeps step', () => {
  const r = ussdStep(newSession(), '9')
  expect(r.session.step).toBe('menu')
})

test('non-numeric basket input is rejected', () => {
  let r = ussdStep(newSession(), '1')
  r = ussdStep(r.session, '1')
  r = ussdStep(r.session, 'abc')
  expect(r.session.step).toBe('baskets')
})
