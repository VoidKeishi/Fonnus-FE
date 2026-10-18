import { createHmac, timingSafeEqual } from 'node:crypto'

/*
 * The voice demo's hour, kept by the server in a cookie it signs (ADR 0009):
 * three minutes of conversation per browser per hour, spent over any number of
 * calls (ADR 0008 point 1).
 *
 * - The window is fixed: it opens with the first ticket of an hour and closes
 *   `WINDOW_MS` later, when the full budget is back. A fixed window has one
 *   answer to "when can I call again"; a sliding one has none.
 * - Charging is pessimistic: a ticket is charged the whole remainder the
 *   moment it is minted, so a second ticket is refused until the first is
 *   refunded.
 * - Settling refunds from ElevenLabs's conversation list: an entry is
 *   re-charged at its conversation's real duration once ElevenLabs has
 *   finished with it, and refunded entirely when its conversation never
 *   appeared within the ticket's fifteen-minute life.
 *
 * Pure apart from `node:crypto`: the clock and the rows are passed in, so it
 * is tested without a server or ElevenLabs. Epoch milliseconds throughout.
 */

/**
 * `MAX_CALL_MS` of `src/api/voice.live.ts`, the per-call cap ADR 0006 chose
 * under the agent's own 180 seconds: one uninterrupted call spends the hour.
 * Repeated rather than imported, since this directory imports nothing of
 * `src/api/` but its four pure files.
 */
export const HOUR_BUDGET_MS = 175_000
export const WINDOW_MS = 3_600_000
/** How long either ticket opens a conversation for, as ElevenLabs documents both. */
export const TICKET_LIFETIME_MS = 900_000
/** Keeps the cookie well under the 4 KB a browser keeps (ADR 0009, accepted residual risk). */
export const MAX_ENTRIES = 24
export const COOKIE_NAME = 'voice_demo_budget'

/**
 * The `at` of the entry the oldest ones are folded into once there are
 * `MAX_ENTRIES`: a charge that is fixed, never settled again. Not 0, which the
 * fifteen-minute rule would read as a ticket long dead and refund.
 */
const FIXED_AT = -1

/** One ticket minted in the window. */
export interface Entry {
  /** The conversation id ElevenLabs gave with the ticket, or null when it gave none. */
  id: string | null
  /** When the ticket was minted; `FIXED_AT` for the folded entry. */
  at: number
  /** What it is charged. */
  ms: number
}

export interface Ledger {
  v: 1
  windowStart: number
  entries: Entry[]
}

/** The wire shape of `GET /api/voice-demo/budget` (docs/api-contract.md §5). */
export interface Budget {
  remaining_ms: number
  /** When the full budget is back; null while it is there. */
  resets_at: number | null
}

const windowEnd = (ledger: Ledger) => ledger.windowStart + WINDOW_MS
const spentIn = (entries: readonly Entry[]) => entries.reduce((sum, entry) => sum + entry.ms, 0)

export function budgetOf(ledger: Ledger | null, now: number): Budget {
  if (!ledger || now >= windowEnd(ledger)) return { remaining_ms: HOUR_BUDGET_MS, resets_at: null }
  const spent = spentIn(ledger.entries)
  if (spent <= 0) return { remaining_ms: HOUR_BUDGET_MS, resets_at: null }
  return { remaining_ms: Math.max(0, HOUR_BUDGET_MS - spent), resets_at: windowEnd(ledger) }
}

// ------------------------------------------------------------------ the list

const STATUSES = ['initiated', 'in-progress', 'processing', 'done', 'failed'] as const

export type ConversationStatus = (typeof STATUSES)[number]

/**
 * A row of ElevenLabs's conversation list, by the three fields the budget
 * reads, as ElevenLabs names them. `unknown` is a row whose id was read and
 * whose status or duration was not: its entry holds its charge.
 */
export type ConversationRow =
  | { conversation_id: string; status: ConversationStatus; call_duration_secs: number }
  | { conversation_id: string; status: 'unknown' }

/** The first page of the list, and whether it holds every conversation asked for. */
export interface ConversationPage {
  rows: ConversationRow[]
  /** `has_more` is `false`. Anything else, absent included, counts as incomplete. */
  complete: boolean
}

function readRow(value: unknown): ConversationRow | null {
  if (typeof value !== 'object' || value === null) return null
  const { conversation_id, status, call_duration_secs } = value as Record<string, unknown>
  // Without an id the row matches no entry, so there is nothing to hold.
  if (typeof conversation_id !== 'string' || !conversation_id) return null
  const known = STATUSES.find((name) => name === status)
  if (known === undefined || typeof call_duration_secs !== 'number' || !Number.isFinite(call_duration_secs) || call_duration_secs < 0) {
    return { conversation_id, status: 'unknown' }
  }
  return { conversation_id, status: known, call_duration_secs }
}

/**
 * The page in the list's success body, `{ "conversations": [{
 * "conversation_id", "status", "call_duration_secs", … }], "has_more",
 * "next_cursor" }` (the API reference, read 2026-10-18), or null without the
 * array. Nothing beyond those three fields and `has_more` is read. A row whose
 * status or duration cannot be read keeps its id as `unknown`, so its entry
 * stays charged rather than falling to the fifteen-minute refund: what cannot
 * be read never counts in the visitor's favour.
 */
export function readConversationPage(body: unknown): ConversationPage | null {
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const rows = fields.conversations
  if (!Array.isArray(rows)) return null
  return { rows: rows.map(readRow).filter((row) => row !== null), complete: fields.has_more === false }
}

/** ElevenLabs has finished with the conversation: its duration is final. */
const SETTLED_STATUSES: ReadonlySet<ConversationStatus> = new Set(['processing', 'done', 'failed'])

/**
 * The refund rule of ADR 0009 point 2. An entry whose conversation ElevenLabs
 * has finished is charged its real duration, lower or higher than before; one
 * still `initiated` or `in-progress`, or whose row could not be read, stays as
 * it is; one with no row at all, fifteen
 * minutes after its ticket was minted, never started and never will, and costs
 * nothing. That last rule needs the whole list: on an incomplete page a
 * missing row may only be off the page, and a visitor there keeps the charge
 * rather than gaining a refund.
 */
export function settle(ledger: Ledger, page: ConversationPage, now: number): Ledger {
  const byId = new Map(page.rows.map((row) => [row.conversation_id, row]))
  const entries = ledger.entries.map((entry): Entry => {
    if (entry.at === FIXED_AT) return entry
    const row = entry.id === null ? undefined : byId.get(entry.id)
    if (row) {
      if (row.status === 'unknown' || !SETTLED_STATUSES.has(row.status)) return entry
      return { ...entry, ms: row.call_duration_secs * 1000 }
    }
    return page.complete && now - entry.at >= TICKET_LIFETIME_MS ? { ...entry, ms: 0 } : entry
  })
  return { ...ledger, entries }
}

/** Whether settling changed any charge: only then does a read write the cookie back. */
export function sameCharges(a: Ledger, b: Ledger): boolean {
  return a.entries.length === b.entries.length && a.entries.every((entry, i) => entry.ms === b.entries[i]?.ms)
}

/**
 * Charges a new ticket the whole remainder, in a new window when there is none
 * or it has ended. Past `MAX_ENTRIES` the oldest entries are folded into one
 * fixed entry first, so the cookie keeps its size and loses no charge.
 */
export function charge(ledger: Ledger | null, id: string | null, now: number): { ledger: Ledger; charged_ms: number } {
  const live: Ledger = ledger && now < windowEnd(ledger) ? ledger : { v: 1, windowStart: now, entries: [] }
  const charged_ms = budgetOf(live, now).remaining_ms
  const kept = live.entries.length < MAX_ENTRIES ? live.entries : fold(live.entries)
  return { ledger: { ...live, entries: [...kept, { id, at: now, ms: charged_ms }] }, charged_ms }
}

/** Leaves room for one more entry under `MAX_ENTRIES`: the oldest become one fixed charge. */
function fold(entries: readonly Entry[]): Entry[] {
  const count = entries.length - MAX_ENTRIES + 2
  return [{ id: null, at: FIXED_AT, ms: spentIn(entries.slice(0, count)) }, ...entries.slice(count)]
}

// ------------------------------------------------------------------ the cookie

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** `base64url(JSON)` + `.` + `base64url(HMAC-SHA256 of the first half)`. */
export function encodeCookie(ledger: Ledger, secret: string): string {
  const payload = Buffer.from(JSON.stringify(ledger)).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function readEntry(value: unknown): Entry | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, at, ms } = value as Record<string, unknown>
  if ((id !== null && typeof id !== 'string') || !isTime(at) || !isTime(ms) || ms < 0) return null
  return { id, at, ms }
}

/**
 * The ledger the cookie carries, or null for anything this server did not
 * sign or cannot read: the full budget, as no cookie is. The signature is
 * compared as the text it was written as, never decoded: base64url ignores the
 * spare bits of its last character, so two spellings decode to one signature.
 */
export function decodeCookie(value: string | undefined, secret: string): Ledger | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 2) return null
  const [payload = '', signature = ''] = parts
  const expected = Buffer.from(sign(payload, secret))
  const given = Buffer.from(signature)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  let json: unknown
  try {
    json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof json !== 'object' || json === null) return null
  const { v, windowStart, entries } = json as Record<string, unknown>
  if (v !== 1 || !isTime(windowStart) || !Array.isArray(entries) || entries.length > MAX_ENTRIES) return null
  const read: Entry[] = []
  for (const value of entries) {
    const entry = readEntry(value)
    if (entry === null) return null
    read.push(entry)
  }
  return { v: 1, windowStart, entries: read }
}

/** The `voice_demo_budget` value of a `Cookie` request header, or undefined. Nothing else in it is read. */
export function cookieValue(header: string | null): string | undefined {
  if (!header) return undefined
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=')
    if (separator === -1) continue
    if (pair.slice(0, separator).trim() === COOKIE_NAME) return pair.slice(separator + 1).trim()
  }
  return undefined
}

/** The request's ledger: null without a cookie, with one that does not verify, or once its window has ended. */
export function readLedger(cookieHeader: string | null, secret: string, now: number): Ledger | null {
  const ledger = decodeCookie(cookieValue(cookieHeader), secret)
  return ledger && now < windowEnd(ledger) ? ledger : null
}

/**
 * The `Set-Cookie` value: kept to the window, scoped to the two voice routes,
 * and out of reach of the page's script. `secure` adds `Secure`, which the
 * server sets in production and only there (`src/server/env.ts`).
 */
export function cookieHeader(ledger: Ledger, secret: string, now: number, secure: boolean): string {
  const maxAge = Math.max(0, Math.floor((windowEnd(ledger) - now) / 1000))
  const attributes = ['Path=/api/voice-demo', `Max-Age=${String(maxAge)}`, 'HttpOnly', ...(secure ? ['Secure'] : []), 'SameSite=Lax']
  return `${COOKIE_NAME}=${encodeCookie(ledger, secret)}; ${attributes.join('; ')}`
}
