import { describe, expect, it } from 'vitest'
import { CHIP_TREE } from '@/data/call-demo'
import type { SuggestionChip } from '@/data/call-demo'
import { budgetLine, chipsAfter, endingLine, spentLine, stateLabel } from './call-state'
import type { CallBudget } from './use-call-budget'

/*
 * The one line under the orb says only what the app knows for sure. In a call
 * that is whether it is still connecting and whether the visitor turned the
 * microphone off; whether she speaks or listens is the SDK's guess, which lags
 * her voice, so a call never says it. A typed conversation has no microphone
 * and says whether to wait or write.
 */

describe('stateLabel, in a call', () => {
  it('says the call is connecting while it connects, whatever the microphone', () => {
    expect(stateLabel('connecting', true, 'voice')).toBe('Đang kết nối…')
    expect(stateLabel('connecting', false, 'voice')).toBe('Đang kết nối…')
  })

  it('never says whether she is speaking or listening', () => {
    expect(stateLabel('speaking', true, 'voice')).toBeNull()
    expect(stateLabel('listening', true, 'voice')).toBeNull()
  })

  it('says the microphone is off and typing works, whether she speaks or listens', () => {
    expect(stateLabel('listening', false, 'voice')).toBe('Micro đang tắt — bạn có thể gõ chữ')
    expect(stateLabel('speaking', false, 'voice')).toBe('Micro đang tắt — bạn có thể gõ chữ')
  })
})

describe('stateLabel, typed', () => {
  it('says the conversation is connecting while it connects', () => {
    expect(stateLabel('connecting', true, 'text')).toBe('Đang kết nối…')
  })

  it('says Linh is answering while her reply is on its way, whatever the microphone', () => {
    expect(stateLabel('speaking', true, 'text')).toBe('Linh đang trả lời…')
    expect(stateLabel('speaking', false, 'text')).toBe('Linh đang trả lời…')
  })

  it('says Linh is waiting for a message once she has answered, whatever the microphone', () => {
    expect(stateLabel('listening', true, 'text')).toBe('Linh đang chờ bạn nhắn')
    expect(stateLabel('listening', false, 'text')).toBe('Linh đang chờ bạn nhắn')
  })
})

/*
 * Where the hour stands is said at two moments only (ADR 0008): on consent,
 * and on the ending of the call that spent it. A sentence that says "gọi lại"
 * without saying when would send the visitor into a call that cannot connect,
 * and a number the server has not given yet must not be said at all.
 */

const RESETS_AT = Date.UTC(2026, 9, 18, 3, 0, 0)
const left = (remainingMs: number, waitMs = 50 * 60_000): CallBudget => ({ remainingMs, resetsAt: RESETS_AT, waitMs })
const spent = (waitMs: number): CallBudget => ({ remainingMs: 0, resetsAt: RESETS_AT, waitMs })
const FULL: CallBudget = { remainingMs: 180_000, resetsAt: null, waitMs: 0 }

describe('budgetLine', () => {
  it('says nothing before the server has answered', () => {
    expect(budgetLine(null)).toBeNull()
  })

  it('says nothing while the whole hour is left', () => {
    expect(budgetLine(FULL)).toBeNull()
  })

  it('says what is left once part of the hour is spent', () => {
    expect(budgetLine(left(155_000))).toBe('Giờ này bạn còn 2 phút 35 giây gọi thử.')
    expect(budgetLine(left(40_000))).toBe('Giờ này bạn còn 40 giây gọi thử.')
  })

  it('says nothing when nothing is left: the spent slot says it instead', () => {
    expect(budgetLine(spent(30 * 60_000))).toBeNull()
  })
})

describe('spentLine', () => {
  it('says when the next call can start', () => {
    expect(spentLine(41 * 60_000 + 1)).toBe(
      'Bạn đã dùng hết 3 phút gọi thử trong giờ này — gọi lại được sau 42 phút. Ở phòng khám của bạn, Linh nghe máy cả ngày.',
    )
  })
})

describe('endingLine', () => {
  it('says the hour is spent, and when it comes back, when the call ends on its cap', () => {
    expect(endingLine('timeout', spent(57 * 60_000))).toBe(
      'Hết 3 phút gọi thử trong giờ này — gọi lại được sau 57 phút. Ở phòng khám của bạn, Linh nghe máy cả ngày.',
    )
  })

  it('says only that the three minutes are up when the hour turned during the call', () => {
    const line = 'Hết 3 phút gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày.'
    expect(endingLine('timeout', FULL)).toBe(line)
    expect(endingLine('timeout', null)).toBe(line)
  })

  it('keeps today’s lines while the hour has time left, or before the server has said', () => {
    const agent = 'Linh đã kết thúc cuộc gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày.'
    expect(endingLine('agent', left(60_000))).toBe(agent)
    expect(endingLine('agent', null)).toBe(agent)
    expect(endingLine('error', left(60_000))).toBe('Mất kết nối với Linh.')
    expect(endingLine('error', null)).toBe('Mất kết nối với Linh.')
  })

  it('adds when the next call can start once the call spent the rest of the hour', () => {
    expect(endingLine('agent', spent(30_000))).toBe(
      'Linh đã kết thúc cuộc gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày. Gọi lại được sau 1 phút.',
    )
    expect(endingLine('error', spent(12 * 60_000))).toBe('Mất kết nối với Linh. Gọi lại được sau 12 phút.')
  })
})

/*
 * The chips walk a visitor through a conversation the product owner wrote.
 * A chip already sent must never come back, because the tree repeats
 * questions, and the walk must always land somewhere: a set of its own, or
 * the first set again once a path ends or runs dry.
 */

const leaf = (label: string): SuggestionChip => ({ label })
const FIRST: readonly SuggestionChip[] = [
  { label: 'Bên mình có những dịch vụ gì?', next: [leaf('Niềng răng giá bao nhiêu ạ?'), leaf('Có trả góp không ạ?')] },
  leaf('Phòng khám ở đâu ạ?'),
  leaf('Thứ Bảy này còn lịch trống không?'),
]
const labels = (chips: readonly SuggestionChip[]) => chips.map((chip) => chip.label)
const sentOf = (...sent: string[]) => new Set(sent)

describe('chipsAfter', () => {
  it('offers the set that follows the chip just sent', () => {
    const [services] = FIRST
    if (!services) throw new Error('fixture has no first chip')
    expect(labels(chipsAfter(services, sentOf(services.label), FIRST))).toEqual([
      'Niềng răng giá bao nhiêu ạ?',
      'Có trả góp không ạ?',
    ])
  })

  it('never offers a question already sent by a chip, by its words', () => {
    const [services] = FIRST
    if (!services) throw new Error('fixture has no first chip')
    expect(labels(chipsAfter(services, sentOf(services.label, 'Có trả góp không ạ?'), FIRST))).toEqual([
      'Niềng răng giá bao nhiêu ạ?',
    ])
  })

  it('goes back to the first set, without what was sent, after the last level', () => {
    const sent = sentOf('Bên mình có những dịch vụ gì?', 'Niềng răng giá bao nhiêu ạ?')
    expect(labels(chipsAfter(leaf('Niềng răng giá bao nhiêu ạ?'), sent, FIRST))).toEqual([
      'Phòng khám ở đâu ạ?',
      'Thứ Bảy này còn lịch trống không?',
    ])
  })

  it('goes back to the first set when every follow-up has been sent already', () => {
    const [services] = FIRST
    if (!services) throw new Error('fixture has no first chip')
    const sent = sentOf(services.label, 'Niềng răng giá bao nhiêu ạ?', 'Có trả góp không ạ?')
    expect(labels(chipsAfter(services, sent, FIRST))).toEqual(['Phòng khám ở đâu ạ?', 'Thứ Bảy này còn lịch trống không?'])
  })

  it('offers nothing once the first set has been sent too', () => {
    const sent = sentOf(...labels(FIRST))
    expect(chipsAfter(leaf('Thứ Bảy này còn lịch trống không?'), sent, FIRST)).toEqual([])
  })
})

/** Every set of the tree with its level, the first set being level 1. */
function setsOf(set: readonly SuggestionChip[], level = 1): { set: readonly SuggestionChip[]; level: number }[] {
  return [{ set, level }, ...set.flatMap((chip) => (chip.next ? setsOf(chip.next, level + 1) : []))]
}

describe('the chip tree', () => {
  const sets = setsOf(CHIP_TREE)

  it('is four levels deep on every path, and no deeper', () => {
    for (const { set, level } of sets) {
      for (const chip of set) expect(chip.next === undefined).toBe(level === 4)
    }
  })

  it('shows at most three chips to a set, none of them empty or repeated', () => {
    for (const { set } of sets) {
      expect(set.length).toBeGreaterThan(0)
      expect(set.length).toBeLessThanOrEqual(3)
      for (const chip of set) expect(chip.label.trim()).not.toBe('')
      expect(new Set(labels(set)).size).toBe(set.length)
    }
  })
})
