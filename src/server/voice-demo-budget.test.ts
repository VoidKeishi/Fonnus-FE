import { describe, expect, it } from 'vitest'
import {
  budgetOf,
  charge,
  COOKIE_NAME,
  cookieHeader,
  cookieValue,
  decodeCookie,
  encodeCookie,
  HOUR_BUDGET_MS,
  MAX_ENTRIES,
  readConversationPage,
  readLedger,
  settle,
  TICKET_LIFETIME_MS,
  WINDOW_MS,
} from './voice-demo-budget'
import type { ConversationPage, ConversationRow, ConversationStatus, Ledger } from './voice-demo-budget'

/*
 * The hour is the only thing between a visitor and an agent billed by the
 * minute. The arithmetic must never hand out more than three minutes, must
 * give back what a call did not use once ElevenLabs says so, and must read any
 * cookie this server did not write as no cookie at all — the browser is what
 * this budget stopped trusting.
 */

const T0 = Date.UTC(2026, 9, 18, 2, 0, 0)
const SECOND = 1000
const MINUTE = 60 * SECOND
const SECRET = 'test-secret-0123456789abcdef'

const ledgerOf = (...entries: Ledger['entries']): Ledger => ({ v: 1, windowStart: T0, entries })
const row = (conversation_id: string, status: ConversationStatus, call_duration_secs: number): ConversationRow => ({
  conversation_id,
  status,
  call_duration_secs,
})
/** The whole list, as one page holds it while the agent has had at most 100 conversations this hour. */
const page = (...rows: ConversationRow[]): ConversationPage => ({ rows, complete: true })

describe('budgetOf', () => {
  it('gives the full budget, with nothing to wait for, to a browser that has never called', () => {
    expect(budgetOf(null, T0)).toEqual({ remaining_ms: HOUR_BUDGET_MS, resets_at: null })
  })

  it('gives the full budget back once the hour has turned', () => {
    const spent = ledgerOf({ id: 'conv_1', at: T0, ms: HOUR_BUDGET_MS })
    expect(budgetOf(spent, T0 + WINDOW_MS)).toEqual({ remaining_ms: HOUR_BUDGET_MS, resets_at: null })
  })

  it('takes what the hour’s calls spent off it, and says the hour turns an hour after it opened', () => {
    const ledger = ledgerOf({ id: 'conv_1', at: T0, ms: 20 * SECOND }, { id: 'conv_2', at: T0 + 5 * MINUTE, ms: 40 * SECOND })
    expect(budgetOf(ledger, T0 + 10 * MINUTE)).toEqual({ remaining_ms: HOUR_BUDGET_MS - 60 * SECOND, resets_at: T0 + WINDOW_MS })
  })

  it('says nothing is left, and when it is back, once the hour is spent', () => {
    const ledger = ledgerOf({ id: 'conv_1', at: T0, ms: 100 * SECOND }, { id: 'conv_2', at: T0, ms: 100 * SECOND })
    expect(budgetOf(ledger, T0 + MINUTE)).toEqual({ remaining_ms: 0, resets_at: T0 + WINDOW_MS })
  })

  it('counts an hour whose every call was refunded as untouched', () => {
    expect(budgetOf(ledgerOf({ id: null, at: T0, ms: 0 }), T0 + 20 * MINUTE)).toEqual({ remaining_ms: HOUR_BUDGET_MS, resets_at: null })
  })
})

describe('settle', () => {
  const minted = ledgerOf({ id: 'conv_1', at: T0, ms: HOUR_BUDGET_MS })

  it.each<ConversationStatus>(['processing', 'done'])('charges a %s conversation its real duration', (status) => {
    expect(settle(minted, page(row('conv_1', status, 20)), T0 + MINUTE).entries).toEqual([{ id: 'conv_1', at: T0, ms: 20 * SECOND }])
  })

  it('charges a failed conversation its duration, higher than before as readily as lower', () => {
    const undercharged = ledgerOf({ id: 'conv_1', at: T0, ms: 10 * SECOND })
    expect(settle(undercharged, page(row('conv_1', 'failed', 30)), T0 + MINUTE).entries[0]?.ms).toBe(30 * SECOND)
  })

  it.each<ConversationStatus>(['initiated', 'in-progress'])('leaves a conversation still %s charged in full', (status) => {
    expect(settle(minted, page(row('conv_1', status, 12)), T0 + MINUTE)).toEqual(minted)
  })

  it('refunds a ticket whose conversation is missing from the whole list fifteen minutes on', () => {
    expect(settle(minted, page(), T0 + TICKET_LIFETIME_MS).entries[0]?.ms).toBe(0)
  })

  it('refunds nothing it cannot see when the page is incomplete, and still charges what it can', () => {
    const offPage = ledgerOf({ id: 'conv_1', at: T0, ms: HOUR_BUDGET_MS }, { id: 'conv_2', at: T0, ms: HOUR_BUDGET_MS })
    const incomplete: ConversationPage = { rows: [row('conv_2', 'done', 30)], complete: false }
    expect(settle(offPage, incomplete, T0 + TICKET_LIFETIME_MS).entries).toEqual([
      { id: 'conv_1', at: T0, ms: HOUR_BUDGET_MS },
      { id: 'conv_2', at: T0, ms: 30 * SECOND },
    ])
  })

  it('holds the charge of a ticket whose row could not be read, fifteen minutes on or not', () => {
    const unreadable = page({ conversation_id: 'conv_1', status: 'unknown' })
    expect(settle(minted, unreadable, T0 + TICKET_LIFETIME_MS)).toEqual(minted)
  })

  it('reads a failed conversation without a usable duration as unreadable, and holds its charge', () => {
    const body = { conversations: [{ conversation_id: 'conv_1', status: 'failed', call_duration_secs: '12' }], has_more: false }
    const read = readConversationPage(body)
    expect(read?.rows).toEqual([{ conversation_id: 'conv_1', status: 'unknown' }])
    expect(read && settle(minted, read, T0 + TICKET_LIFETIME_MS)).toEqual(minted)
  })

  it('keeps charging a ticket that may still start a conversation', () => {
    expect(settle(minted, page(), T0 + TICKET_LIFETIME_MS - 1)).toEqual(minted)
  })

  it('refunds a ticket that came without a conversation id only by the fifteen-minute rule', () => {
    const anonymous = ledgerOf({ id: null, at: T0, ms: HOUR_BUDGET_MS })
    expect(settle(anonymous, page(row('conv_9', 'done', 5)), T0 + MINUTE)).toEqual(anonymous)
    expect(settle(anonymous, page(row('conv_9', 'done', 5)), T0 + TICKET_LIFETIME_MS).entries[0]?.ms).toBe(0)
  })

  it('reads only the rows of its own conversations', () => {
    const ledger = ledgerOf({ id: 'conv_1', at: T0, ms: HOUR_BUDGET_MS })
    expect(settle(ledger, page(row('conv_other', 'done', 3), row('conv_1', 'done', 50)), T0 + MINUTE).entries[0]?.ms).toBe(50 * SECOND)
  })
})

describe('charge', () => {
  it('opens a window with the first ticket and charges it the whole budget', () => {
    expect(charge(null, 'conv_1', T0)).toEqual({
      ledger: { v: 1, windowStart: T0, entries: [{ id: 'conv_1', at: T0, ms: HOUR_BUDGET_MS }] },
      charged_ms: HOUR_BUDGET_MS,
    })
  })

  it('charges the next ticket of the same hour what is left of it', () => {
    const settled = ledgerOf({ id: 'conv_1', at: T0, ms: 20 * SECOND })
    const next = charge(settled, 'conv_2', T0 + 5 * MINUTE)
    expect(next.charged_ms).toBe(HOUR_BUDGET_MS - 20 * SECOND)
    expect(next.ledger.windowStart).toBe(T0)
    expect(next.ledger.entries).toHaveLength(2)
  })

  it('opens a new window once the last one has ended', () => {
    const old = ledgerOf({ id: 'conv_1', at: T0, ms: HOUR_BUDGET_MS })
    const later = T0 + WINDOW_MS + 5 * SECOND
    expect(charge(old, 'conv_2', later).ledger).toEqual({ v: 1, windowStart: later, entries: [{ id: 'conv_2', at: later, ms: HOUR_BUDGET_MS }] })
  })

  it('folds the oldest tickets into one fixed charge on the 25th, which settling never refunds', () => {
    let ledger: Ledger | null = null
    for (let i = 0; i < MAX_ENTRIES; i += 1) {
      ledger = charge(ledger, `conv_${String(i)}`, T0 + i * SECOND).ledger
      // Each call lasts five seconds and is settled before the next ticket.
      ledger = settle(ledger, page(row(`conv_${String(i)}`, 'done', 5)), T0 + i * SECOND + 1)
    }
    const folded = charge(ledger, 'conv_last', T0 + 30 * MINUTE)
    expect(folded.ledger.entries).toHaveLength(MAX_ENTRIES)
    expect(folded.ledger.entries[0]).toEqual({ id: null, at: -1, ms: 10 * SECOND })
    expect(folded.charged_ms).toBe(HOUR_BUDGET_MS - MAX_ENTRIES * 5 * SECOND)

    const muchLater = settle(folded.ledger, page(), T0 + WINDOW_MS - 1)
    expect(muchLater.entries[0]).toEqual({ id: null, at: -1, ms: 10 * SECOND })
  })
})

describe('the cookie', () => {
  const ledger = ledgerOf({ id: 'conv_1', at: T0, ms: 20 * SECOND }, { id: null, at: T0 + MINUTE, ms: 0 })

  /** The value with one character of `half` swapped for another. */
  function tamper(value: string, half: 0 | 1): string {
    // The signature's last character carries two spare bits, the case a
    // comparison of the decoded bytes would miss.
    const index = half === 0 ? 3 : value.length - 1
    const swapped = value[index] === 'A' ? 'B' : 'A'
    return value.slice(0, index) + swapped + value.slice(index + 1)
  }

  it('reads back what it wrote', () => {
    expect(decodeCookie(encodeCookie(ledger, SECRET), SECRET)).toEqual(ledger)
  })

  it('reads a cookie with one character changed in either half as no cookie', () => {
    const value = encodeCookie(ledger, SECRET)
    expect(decodeCookie(tamper(value, 0), SECRET)).toBeNull()
    expect(decodeCookie(tamper(value, 1), SECRET)).toBeNull()
  })

  it('reads a cookie signed with another secret as no cookie', () => {
    expect(decodeCookie(encodeCookie(ledger, 'another-secret'), SECRET)).toBeNull()
  })

  it.each([
    ['nothing', undefined],
    ['empty', ''],
    ['no signature', 'eyJ2IjoxfQ'],
    ['three parts', 'a.b.c'],
  ])('reads junk as no cookie: %s', (_, value) => {
    expect(decodeCookie(value, SECRET)).toBeNull()
  })

  it('reads a signed payload that is not a ledger as no cookie', () => {
    const payload = Buffer.from(JSON.stringify({ v: 2, windowStart: T0, entries: [] })).toString('base64url')
    const signed = encodeCookie(ledger, SECRET).split('.')[1] ?? ''
    expect(decodeCookie(`${payload}.${signed}`, SECRET)).toBeNull()
  })

  it('reads a cookie whose hour has ended as no cookie', () => {
    const header = `${COOKIE_NAME}=${encodeCookie(ledger, SECRET)}`
    expect(readLedger(header, SECRET, T0 + WINDOW_MS - 1)).toEqual(ledger)
    expect(readLedger(header, SECRET, T0 + WINDOW_MS)).toBeNull()
  })

  it('is httpOnly, Secure, Lax and scoped to the voice routes in production, and lives to the end of the hour', () => {
    const header = cookieHeader(ledger, SECRET, T0 + 15 * MINUTE, true)
    expect(header.startsWith(`voice_demo_budget=${encodeCookie(ledger, SECRET)}; `)).toBe(true)
    expect(header.split('; ').slice(1)).toEqual(['Path=/api/voice-demo', 'Max-Age=2700', 'HttpOnly', 'Secure', 'SameSite=Lax'])
    expect(cookieHeader(ledger, SECRET, T0, true)).toContain('Max-Age=3600;')
  })

  it('drops Secure in development, where a phone reaches the server over plain http', () => {
    const header = cookieHeader(ledger, SECRET, T0 + 15 * MINUTE, false)
    expect(header.split('; ').slice(1)).toEqual(['Path=/api/voice-demo', 'Max-Age=2700', 'HttpOnly', 'SameSite=Lax'])
  })
})

describe('cookieValue', () => {
  it('finds nothing in a request without the cookie', () => {
    expect(cookieValue(null)).toBeUndefined()
    expect(cookieValue('theme=warm; fonnus_session=abc')).toBeUndefined()
  })

  it('finds the budget among other cookies', () => {
    expect(cookieValue('fonnus_session=abc; voice_demo_budget=eyJ2.c2ln; theme=warm')).toBe('eyJ2.c2ln')
  })

  it('skips a malformed pair, and a cookie whose name only ends the same', () => {
    expect(cookieValue('garbage; old_voice_demo_budget=x; voice_demo_budget=eyJ2.c2ln')).toBe('eyJ2.c2ln')
  })
})
