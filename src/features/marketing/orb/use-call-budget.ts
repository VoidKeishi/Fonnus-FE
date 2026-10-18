import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isCanceled } from '@/api'
import type { VoiceBudget } from '@/api'

/*
 * The call demo's side of the visitor's hour (ADR 0009 point 4): what the
 * screen last heard of it from the server, which keeps it. Nothing is kept
 * here between reads, and nothing is read during render, so the server render
 * and the first client render agree that the budget is not known yet.
 */

/** Where the visitor's hour stood at the last answer. */
export interface CallBudget {
  remainingMs: number
  /** When the full budget is back; null while it is there. */
  resetsAt: number | null
  /** From that answer until `resetsAt`; 0 while the full budget is there. */
  waitMs: number
}

const AFTER_RESET_MS = 1_000

/*
 * ElevenLabs lists a call as `in-progress` for a few seconds after hang-up,
 * so a read at once still sees the ticket's pessimistic charge (ADR 0009
 * "Assumed"). An ending therefore reads this long after the call, once,
 * keeping its ordinary shape until then; a refusal for a spent hour reads at
 * once, for the slot it shows, and again this long later if that said
 * "spent", before the screen holds the visitor to it for the rest of the hour.
 */
const SETTLE_LAG_MS = 5_000

/** How a read ended: answered, failed, or overtaken by a newer read or the call closing. */
export type BudgetRead = 'read' | 'failed' | 'canceled'

function fromAnswer(answer: VoiceBudget, now = Date.now()): CallBudget {
  return {
    remainingMs: answer.remaining_ms,
    resetsAt: answer.resets_at,
    waitMs: answer.resets_at === null ? 0 : Math.max(0, answer.resets_at - now),
  }
}

export interface CallBudgetState {
  /** Null until an answer says otherwise: the slots then keep their ordinary shape, and the tap tells the truth. */
  budget: CallBudget | null
  /**
   * Asks the server, aborting a read still in flight or waiting. A failed
   * read leaves the budget as it was: it never invents a number.
   * `recheckSpent`, for the read after a refusal: an answer of "spent" is read
   * once more `SETTLE_LAG_MS` later. The promise settles with the first read.
   */
  refreshBudget: (opts?: { recheckSpent?: boolean }) => Promise<BudgetRead>
  /** For an ending: forgets the budget and reads it once, `SETTLE_LAG_MS` from now. */
  refreshBudgetAfterCall: () => void
  /** Sets the budget from an answer already in hand, or forgets it with null; a read in flight or waiting is dropped. */
  setBudget: (answer: VoiceBudget | null) => void
  /**
   * Drops a read in flight or waiting, before a ticket is asked for: a read's
   * answer must not land after the ticket's and stand for an hour the ticket
   * has already charged.
   */
  stopBudgetRead: () => void
}

/**
 * `open`: the call screen is open; a read still in flight when it closes is
 * aborted, and one waiting is dropped. `onSlot`: it is on its consent slot or on an ending. With nothing
 * of the hour left either one says when to come back, and turns back into its
 * ordinary shape, "Gọi lại" included, when the hour does: one timer to the
 * reset that reads again, gone with the slot.
 */
export function useCallBudget(open: boolean, onSlot: boolean): CallBudgetState {
  const [budget, setBudgetState] = useState<CallBudget | null>(null)
  const reading = useRef<AbortController | null>(null)
  /** A read waiting to start: an ending's, or a refusal's recheck. */
  const waiting = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const stopReading = useCallback(() => {
    reading.current?.abort()
    reading.current = null
    clearTimeout(waiting.current)
    waiting.current = undefined
  }, [])

  const refreshBudget = useCallback(function read({ recheckSpent = false } = {}): Promise<BudgetRead> {
    stopReading()
    const controller = new AbortController()
    reading.current = controller
    return api.voice.budget({ signal: controller.signal }).then(
      (answer): BudgetRead => {
        if (controller.signal.aborted) return 'canceled'
        reading.current = null
        setBudgetState(fromAnswer(answer))
        if (recheckSpent && answer.remaining_ms <= 0) {
          waiting.current = setTimeout(() => {
            waiting.current = undefined
            void read()
          }, SETTLE_LAG_MS)
        }
        return 'read'
      },
      (err: unknown): BudgetRead => {
        if (controller.signal.aborted || isCanceled(err)) return 'canceled'
        reading.current = null
        return 'failed'
      },
    )
  }, [stopReading])

  const setBudget = useCallback(
    (answer: VoiceBudget | null) => {
      stopReading()
      setBudgetState(answer === null ? null : fromAnswer(answer))
    },
    [stopReading],
  )

  const refreshBudgetAfterCall = useCallback(() => {
    stopReading()
    setBudgetState(null)
    waiting.current = setTimeout(() => {
      waiting.current = undefined
      void refreshBudget()
    }, SETTLE_LAG_MS)
  }, [stopReading, refreshBudget])

  // The cleanup runs when the call closes and when the layout unmounts.
  useEffect(() => {
    if (!open) return
    return stopReading
  }, [open, stopReading])

  const spentUntil = onSlot && budget !== null && budget.remainingMs <= 0 ? budget.resetsAt : null
  useEffect(() => {
    if (spentUntil === null) return
    // A moment after the reset, never before: a read that reached the server a
    // hair early would find the old hour, and nothing would read again.
    const timer = setTimeout(
      () => {
        void refreshBudget()
      },
      Math.max(0, spentUntil - Date.now()) + AFTER_RESET_MS,
    )
    return () => {
      clearTimeout(timer)
    }
  }, [spentUntil, refreshBudget])

  return { budget, refreshBudget, refreshBudgetAfterCall, setBudget, stopBudgetRead: stopReading }
}
