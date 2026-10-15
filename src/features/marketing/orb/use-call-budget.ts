import { useCallback, useEffect, useRef, useState } from 'react'
import { budgetAt, closeEntry, closeEntryAtCap, HOUR_BUDGET_MS, openEntry } from './call-budget'
import type { Budget } from './call-budget'
import { readLedger, writeLedger } from './call-budget-store'

/*
 * The call demo's side of the hour's budget (ADR 0008): what the screen knows
 * of it, and the ledger entry of the session attached in this tab. The ledger
 * is read from the call's handlers and from one timer, never during render, so
 * the server render and the first client render agree on the full budget.
 */

/** Where the visitor's hour stands, as the ledger said at the last read. */
export interface CallBudget extends Budget {
  /** From that read until `resetsAt`; 0 while the full budget is there. */
  waitMs: number
}

const FULL_BUDGET: CallBudget = { remainingMs: HOUR_BUDGET_MS, resetsAt: null, waitMs: 0 }

function readBudget(now = Date.now()): CallBudget {
  const budget = budgetAt(readLedger(), now)
  return { ...budget, waitMs: budget.resetsAt === null ? 0 : budget.resetsAt - now }
}

export interface CallBudgetState {
  budget: CallBudget
  /** Reads the ledger into `budget`, and returns what it read. */
  refreshBudget: () => CallBudget
  /** A session is attached: its seconds count from now. */
  startSpending: () => void
  /**
   * The attached session ended: its seconds stop counting. On its cap it spent
   * all it was given, whatever the two clocks say. A no-op when none is attached.
   */
  stopSpending: (atCap?: boolean) => void
}

/**
 * `onSlot`: the call is open on its consent slot or on an ending. With nothing
 * of the hour left either one says when to come back, and turns back into its
 * ordinary shape, "Gọi lại" included, when the hour does: one timer to the
 * reset, gone with the slot.
 */
export function useCallBudget(onSlot: boolean): CallBudgetState {
  const [budget, setBudget] = useState<CallBudget>(FULL_BUDGET)
  /** This tab's attached session holds the ledger's open entry. */
  const spending = useRef(false)

  const refreshBudget = useCallback(() => {
    const next = readBudget()
    setBudget(next)
    return next
  }, [])

  const startSpending = useCallback(() => {
    writeLedger(openEntry(readLedger(), Date.now()))
    spending.current = true
  }, [])

  const stopSpending = useCallback((atCap = false) => {
    if (!spending.current) return
    spending.current = false
    const ledger = readLedger()
    if (ledger) writeLedger(atCap ? closeEntryAtCap(ledger) : closeEntry(ledger, Date.now()))
  }, [])

  const spentUntil = onSlot && budget.remainingMs <= 0 ? budget.resetsAt : null
  useEffect(() => {
    if (spentUntil === null) return
    const timer = setTimeout(() => {
      // Read at the reset at the earliest, so a timer a hair early never reads the old hour.
      setBudget(readBudget(Math.max(Date.now(), spentUntil)))
    }, spentUntil - Date.now())
    return () => {
      clearTimeout(timer)
    }
  }, [spentUntil])

  return { budget, refreshBudget, startSpending, stopSpending }
}
