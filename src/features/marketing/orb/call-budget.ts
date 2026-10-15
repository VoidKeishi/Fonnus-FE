/*
 * The hour's budget of the "Nghe thử" call (ADR 0008): three minutes of
 * conversation per browser per hour, spent over any number of calls.
 *
 * - The window is fixed: it opens with the first session that is attached in
 *   an hour and closes `WINDOW_MS` later, when the full budget is back. A fixed
 *   window has one answer to "when can I call again"; a sliding one has none.
 * - An entry is opened when a session is attached and closed when it ends. It
 *   counts its own seconds, never more than what was left when it opened —
 *   which is also the cap the session was started with.
 * - An entry still open when the ledger is read belongs to a tab that is gone
 *   without saying so, or to another tab mid-call; either way it counts as
 *   having run to its cap. That costs a visitor at most the call they left.
 *
 * Pure: the clock is passed in, and storage is `call-budget-store.ts`'s job.
 */

/**
 * `MAX_CALL_MS` of `src/api/voice.live.ts`, the per-call cap ADR 0006 chose
 * under the agent's own 180 seconds. Repeated rather than imported: a feature
 * reaches `src/api/` only through `@/api`, which does not export it, and this
 * module stays free of the API's imports. One uninterrupted call spends it.
 */
export const HOUR_BUDGET_MS = 175_000
export const WINDOW_MS = 60 * 60_000

/** What this browser has spent in the current window. Plain JSON, versionless. */
export interface Ledger {
  /** When the window opened, in epoch milliseconds. */
  windowStart: number
  /** Spent by the entries already closed in this window. */
  usedMs: number
  /** The entry of a session attached and not yet ended, or null. */
  open: { start: number } | null
}

export interface Budget {
  remainingMs: number
  /** When the full budget is back; null while it is. */
  resetsAt: number | null
}

const FULL: Budget = { remainingMs: HOUR_BUDGET_MS, resetsAt: null }

const windowEnd = (ledger: Ledger) => ledger.windowStart + WINDOW_MS
/** What the open entry may spend: what was left when it opened. */
const entryCap = (ledger: Ledger) => Math.max(0, HOUR_BUDGET_MS - ledger.usedMs)

export function budgetAt(ledger: Ledger | null, now: number): Budget {
  if (!ledger || now >= windowEnd(ledger)) return FULL
  const used = ledger.usedMs + (ledger.open ? entryCap(ledger) : 0)
  if (used <= 0) return FULL
  return { remainingMs: Math.max(0, HOUR_BUDGET_MS - used), resetsAt: windowEnd(ledger) }
}

/** Opens an entry at `now`, in a new window if there is none or it has ended. */
export function openEntry(ledger: Ledger | null, now: number): Ledger {
  const settled = ledger ? closeEntryAtCap(ledger) : null
  const live = settled && now < windowEnd(settled) ? settled : { windowStart: now, usedMs: 0, open: null }
  return { ...live, open: { start: now } }
}

/** Closes the open entry with the seconds it ran, up to its cap. A no-op when nothing is open. */
export function closeEntry(ledger: Ledger, now: number): Ledger {
  if (!ledger.open) return ledger
  const ran = Math.max(0, now - ledger.open.start)
  return { ...ledger, usedMs: ledger.usedMs + Math.min(ran, entryCap(ledger)), open: null }
}

/**
 * Closes the open entry as having run to its cap: a session that ended on its
 * cap, or an entry nobody closed. The cap's own timer may fire a millisecond
 * before the entry's clock agrees, and a budget left at 1 ms is not a call.
 */
export function closeEntryAtCap(ledger: Ledger): Ledger {
  if (!ledger.open) return ledger
  return { ...ledger, usedMs: ledger.usedMs + entryCap(ledger), open: null }
}

const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Anything that is not a ledger this module wrote reads as no ledger: the full budget. */
export function parseLedger(json: string | null): Ledger | null {
  if (json === null) return null
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const { windowStart, usedMs, open } = value as Record<string, unknown>
  if (!isTime(windowStart) || !isTime(usedMs) || usedMs < 0) return null
  if (open === null) return { windowStart, usedMs, open: null }
  const start = typeof open === 'object' ? (open as Record<string, unknown>).start : undefined
  if (!isTime(start)) return null
  return { windowStart, usedMs, open: { start } }
}

export function serializeLedger(ledger: Ledger): string {
  return JSON.stringify(ledger)
}

/**
 * What is left, as the consent line says it: "2 phút 10 giây", "2 phút",
 * "40 giây". Whole seconds, rounded down, but never "0 giây" for a remainder
 * that still opens a call.
 */
export function remainingLabel(ms: number): string {
  const seconds = Math.max(1, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${String(rest)} giây`
  if (rest === 0) return `${String(minutes)} phút`
  return `${String(minutes)} phút ${String(rest)} giây`
}

/** How long until the budget is back, in whole minutes rounded up: "42 phút", never "0 phút". */
export function waitLabel(ms: number): string {
  return `${String(Math.max(1, Math.ceil(ms / 60_000)))} phút`
}
