import { describe, expect, it } from 'vitest'
import {
  budgetAt,
  closeEntry,
  closeEntryAtCap,
  HOUR_BUDGET_MS,
  openEntry,
  parseLedger,
  remainingLabel,
  serializeLedger,
  waitLabel,
  WINDOW_MS,
} from './call-budget'
import type { Ledger } from './call-budget'
import { MAX_CALL_MS } from '@/api/voice.live'

/*
 * The hour's budget is the only thing between a visitor and an agent billed by
 * the minute, and the only number the call screen shows. Getting it wrong
 * either cuts a visitor off before their three minutes or hands out more, and
 * a label that reads "0 giây" or "0 phút" is a promise the screen cannot keep.
 */

const T0 = Date.UTC(2026, 9, 15, 2, 0, 0)
const SECOND = 1000

/** One session attached at `start` that ran `ms`. */
const call = (ledger: Ledger | null, start: number, ms: number) => closeEntry(openEntry(ledger, start), start + ms)

describe('the hour', () => {
  it('is worth exactly one uninterrupted call, so the two caps never disagree', () => {
    expect(HOUR_BUDGET_MS).toBe(MAX_CALL_MS)
  })
})

describe('budgetAt', () => {
  it('gives the full budget, with nothing to wait for, to a browser that has never called', () => {
    expect(budgetAt(null, T0)).toEqual({ remainingMs: HOUR_BUDGET_MS, resetsAt: null })
  })

  it('takes what a call spent off the hour, and says the hour turns an hour after the first call', () => {
    const ledger = call(null, T0, 20 * SECOND)
    expect(budgetAt(ledger, T0 + 5 * 60 * SECOND)).toEqual({
      remainingMs: HOUR_BUDGET_MS - 20 * SECOND,
      resetsAt: T0 + WINDOW_MS,
    })
  })

  it('adds up the seconds of every call in the hour', () => {
    const ledger = call(call(null, T0, 20 * SECOND), T0 + 10 * 60 * SECOND, 40 * SECOND)
    expect(budgetAt(ledger, T0 + 11 * 60 * SECOND).remainingMs).toBe(HOUR_BUDGET_MS - 60 * SECOND)
  })

  it('gives the full budget back once the hour has turned', () => {
    const ledger = call(null, T0, HOUR_BUDGET_MS)
    expect(budgetAt(ledger, T0 + WINDOW_MS - 1).remainingMs).toBe(0)
    expect(budgetAt(ledger, T0 + WINDOW_MS)).toEqual({ remainingMs: HOUR_BUDGET_MS, resetsAt: null })
  })

  it('gives the full budget back to a call that ran past the turn of the hour, and the next call opens a new hour', () => {
    const spentEarly = call(null, T0, 2 * 60 * SECOND)
    const straddling = call(spentEarly, T0 + WINDOW_MS - 30 * SECOND, 55 * SECOND)
    const after = T0 + WINDOW_MS + 25 * SECOND
    expect(budgetAt(straddling, after)).toEqual({ remainingMs: HOUR_BUDGET_MS, resetsAt: null })
    expect(openEntry(straddling, after).windowStart).toBe(after)
  })

  it('counts an entry nobody closed as having run to its cap, and no further', () => {
    const crashed = openEntry(call(null, T0, 60 * SECOND), T0 + 2 * 60 * SECOND)
    expect(budgetAt(crashed, T0 + 3 * 60 * SECOND).remainingMs).toBe(0)
    // Opening the next call settles it at its cap, not at the time since.
    const next = openEntry(crashed, T0 + 30 * 60 * SECOND)
    expect(next.usedMs).toBe(HOUR_BUDGET_MS)
  })
})

describe('openEntry', () => {
  it('starts a new hour when the last one has ended', () => {
    const old = call(null, T0, HOUR_BUDGET_MS)
    const later = T0 + WINDOW_MS + 5 * SECOND
    expect(openEntry(old, later)).toEqual({ windowStart: later, usedMs: 0, open: { start: later } })
  })

  it('keeps the hour that is still running', () => {
    const ledger = call(null, T0, 20 * SECOND)
    expect(openEntry(ledger, T0 + 60 * SECOND)).toEqual({
      windowStart: T0,
      usedMs: 20 * SECOND,
      open: { start: T0 + 60 * SECOND },
    })
  })
})

describe('closeEntry', () => {
  it('counts no more than what was left when the call opened', () => {
    const ledger = call(call(null, T0, 100 * SECOND), T0 + 5 * 60 * SECOND, 10 * 60 * SECOND)
    expect(ledger.usedMs).toBe(HOUR_BUDGET_MS)
  })

  it('changes nothing when no call is open', () => {
    const ledger = call(null, T0, 20 * SECOND)
    expect(closeEntry(ledger, T0 + 60 * SECOND)).toBe(ledger)
    expect(closeEntryAtCap(ledger)).toBe(ledger)
  })

  it('spends the whole remainder for a call that ended on its cap, a millisecond early or not', () => {
    const opened = openEntry(call(null, T0, 20 * SECOND), T0 + 60 * SECOND)
    expect(budgetAt(closeEntryAtCap(opened), T0 + 5 * 60 * SECOND).remainingMs).toBe(0)
  })
})

describe('parseLedger', () => {
  it('reads back what it wrote', () => {
    const ledger = openEntry(call(null, T0, 20 * SECOND), T0 + 60 * SECOND)
    expect(parseLedger(serializeLedger(ledger))).toEqual(ledger)
  })

  it.each([
    ['nothing stored', null],
    ['not JSON', '{windowStart'],
    ['a number', '42'],
    ['a field missing', '{"windowStart":1,"open":null}'],
    ['a negative spend', '{"windowStart":1,"usedMs":-5,"open":null}'],
    ['an open entry without a start', '{"windowStart":1,"usedMs":0,"open":{}}'],
  ])('reads junk as no ledger: %s', (_, json) => {
    expect(parseLedger(json)).toBeNull()
  })
})

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
    [WINDOW_MS, '60 phút'],
  ])('says %i ms as "%s"', (ms, label) => {
    expect(waitLabel(ms)).toBe(label)
  })
})
