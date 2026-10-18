import { describe, expect, it } from 'vitest'
import { remainingLabel, waitLabel } from './call-budget'

/*
 * The only numbers the call screen shows. A label that reads "0 giây" or
 * "0 phút" is a promise the screen cannot keep: a call with nothing left, or a
 * wait that is already over.
 */

const SECOND = 1000

describe('remainingLabel', () => {
  it.each([
    [130 * SECOND, '2 phút 10 giây'],
    [155 * SECOND + 900, '2 phút 35 giây'],
    [120 * SECOND, '2 phút'],
    [40 * SECOND, '40 giây'],
    [1500, '1 giây'],
    [300, '1 giây'],
  ])('says %i ms as "%s"', (ms, label) => {
    expect(remainingLabel(ms)).toBe(label)
  })
})

describe('waitLabel', () => {
  it.each([
    [41 * 60 * SECOND + 1, '42 phút'],
    [42 * 60 * SECOND, '42 phút'],
    [30 * SECOND, '1 phút'],
    [0, '1 phút'],
    [60 * 60 * SECOND, '60 phút'],
  ])('says %i ms as "%s"', (ms, label) => {
    expect(waitLabel(ms)).toBe(label)
  })
})
