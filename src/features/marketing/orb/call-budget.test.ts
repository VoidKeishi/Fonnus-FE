import { describe, expect, it } from 'vitest'
import { clockLabel, nextTickMs, remainingLabel, waitLabel } from './call-budget'

/*
 * The only numbers the call screen shows. A label that reads "0 giây" or
 * "0 phút" is a promise the screen cannot keep: a call with nothing left, or a
 * wait that is already over. The countdown is the other way round: it must
 * read "0:00" at the cut, and not while a second is still left.
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

describe('clockLabel', () => {
  it.each([
    [180 * SECOND, '3:00'],
    [159 * SECOND, '2:39'],
    [158 * SECOND + 1, '2:39'],
    [80 * SECOND, '1:20'],
    [9 * SECOND, '0:09'],
    [300, '0:01'],
    [0, '0:00'],
    [-400, '0:00'],
  ])('says %i ms as "%s"', (ms, label) => {
    expect(clockLabel(ms)).toBe(label)
  })
})

describe('nextTickMs', () => {
  it.each([
    [159 * SECOND + 400, 400],
    [159 * SECOND, 1000],
    [158 * SECOND + 1, 1],
  ])('wakes the countdown %i ms from the cut after %i ms, when its number changes', (leftMs, wait) => {
    expect(nextTickMs(leftMs)).toBe(wait)
    expect(clockLabel(leftMs - wait)).not.toBe(clockLabel(leftMs))
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
