import { parseLedger, serializeLedger } from './call-budget'
import type { Ledger } from './call-budget'

const KEY = 'fonnus.voice-demo.budget'

/**
 * Where this browser keeps the call demo's hour (ADR 0008 point 4).
 *
 * Read only from the call's own event handlers, never during render, so the
 * server render never needs an answer. Guarded on `typeof window` all the
 * same, and storage that refuses — private mode, quota, disabled — reads as
 * no ledger and writes nothing: the visitor gets the full budget, which is
 * what clearing site data gives them anyway.
 */
export function readLedger(): Ledger | null {
  if (typeof window === 'undefined') return null
  try {
    return parseLedger(window.localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function writeLedger(ledger: Ledger): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, serializeLedger(ledger))
  } catch {
    // Storage refused: the hour goes uncounted, as it does after clearing site data.
  }
}
