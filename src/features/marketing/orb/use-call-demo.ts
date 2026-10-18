import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, isApiError } from '@/api'
import type { VoiceBudget, VoiceEndReason, VoiceInput, VoiceSession } from '@/api'
import type { AgentState } from './call-state'
import { useCallBudget } from './use-call-budget'
import type { CallBudget } from './use-call-budget'

/*
 * The "Nghe thử" call. Everything the receptionist does comes from a
 * `VoiceSession` (`api.voice`), which is always the ElevenLabs agent: there is
 * no recording behind it (ADR 0007).
 *
 * - The call opens on a consent line and connects only on its button: the
 *   visitor's voice is personal data and leaves the country, so the
 *   microphone prompt and the token request start inside that tap, never on
 *   the orb click (ADR 0006 point 8).
 * - A browser that gives no microphone, for any reason, gets the same agent
 *   typed: `connect` rejects with `microphone_unavailable` and the call
 *   connects again with `input: 'text'`, inside the same tap and without a
 *   second consent (ADR 0007 point 3).
 * - Any other rejection is a failed call, and the screen says so; nothing
 *   stands in for the agent.
 * - A session that ends on its own — the agent hung up, the duration cap, a
 *   dropped connection — leaves the screen open on its ending, which offers
 *   to call again while the hour has time left.
 * - The visitor has three minutes an hour, spent over any number of calls
 *   (ADR 0008), and the server keeps them (ADR 0009). The screen reads where
 *   the hour stands as the call opens and as a call ends on its own, and each
 *   call is capped by its ticket's answer. A number not known yet, or a read
 *   that failed, leaves every slot in its ordinary shape, and the tap tells
 *   the truth: a ticket refused for a spent hour turns the screen to the spent
 *   slot, with the time from one more read.
 */

/** Set on <html> while the call is open; `globals.css` turns it into the scroll lock. */
const SCROLL_LOCK = 'data-scroll-lock'

/** One line of a typed conversation. */
export interface ThreadLine {
  /** The hook's own counter, for the list key; the session's events carry none. */
  id: number
  from: 'agent' | 'visitor'
  text: string
}

export interface CallDemo {
  open: boolean
  agent: AgentState
  mic: boolean
  /** Why the session ended on its own (never `user`), or null while it has not. */
  ended: VoiceEndReason | null
  /** The call is open on the consent line and nothing is connected yet. */
  awaitingConsent: boolean
  /**
   * How the visitor talks to her: null while the call is being tried, `text`
   * from the moment the browser gives no microphone, `voice` once a call is attached.
   */
  input: VoiceInput | null
  /** The typed conversation so far, oldest first. Empty in a voice call. */
  messages: readonly ThreadLine[]
  /** Nothing could connect: the screen says so and offers to call again. */
  failed: boolean
  /**
   * What is left of the hour as the server last said, or null while it has
   * not: read when the call opens, when one ends on its own, when a ticket is
   * refused for it, and when the hour turns under a slot that says when. With
   * nothing left the consent slot says when the next call can start, and no
   * ending offers to call again until then.
   */
  budget: CallBudget | null
  /**
   * Opens the call screen on the consent line. `returnFocusTo` is the control
   * focus goes back to when the call closes; without one, or once it has left
   * the page, focus goes to the orb.
   */
  openCall: (returnFocusTo?: HTMLElement | null) => void
  /**
   * Connects. Called from the consent button and from "Gọi lại", inside the
   * tap: the microphone prompt needs it. `challenge` is the call screen's
   * Turnstile widget (`use-turnstile.ts`), which every ticket costs; both
   * attempts of the tap are handed it.
   */
  startCall: (challenge: (signal: AbortSignal) => Promise<string>) => void
  closeCall: () => void
  /** The control the current call was opened from, as handed to `openCall`. */
  returnFocusTo: () => HTMLElement | null
  /** A suggestion chip or the typed box. */
  ask: (text: string) => void
  /** The visitor is typing in the box; keeps her from ending a conversation she thinks is silent. */
  noteActivity: () => void
  toggleMic: () => void
  /**
   * Live loudness of her voice, 0–1, or null when nothing is playing.
   * Polled from the orb's animation frame, never pushed through React state:
   * a 60fps signal there would re-render every consumer each frame.
   */
  getAmplitude: () => number | null
}

export function useCallDemoState(): CallDemo {
  const [open, setOpen] = useState(false)
  const [agent, setAgent] = useState<AgentState>('connecting')
  const [mic, setMic] = useState(true)
  const [ended, setEnded] = useState<VoiceEndReason | null>(null)
  const [awaitingConsent, setAwaitingConsent] = useState(false)
  const [input, setInput] = useState<VoiceInput | null>(null)
  const [messages, setMessages] = useState<readonly ThreadLine[]>([])
  const [failed, setFailed] = useState(false)
  const onSlot = open && (awaitingConsent || ended !== null)
  const { budget, refreshBudget, refreshBudgetAfterCall, setBudget, stopBudgetRead } = useCallBudget(open, onSlot)

  const session = useRef<VoiceSession | null>(null)
  const unsubscribe = useRef<(() => void) | null>(null)
  const connecting = useRef<AbortController | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  /** Mirrors `mic` for the session calls, so two quick taps never read the same stale value. */
  const micRef = useRef(true)
  /** Bumped by every open, connect and close, so a session that arrives for an earlier call is closed unheard. */
  const turn = useRef(0)
  /** The next thread line's id. Never reset: ids only have to differ within one call. */
  const nextLineId = useRef(0)

  const endSession = useCallback(() => {
    turn.current += 1
    connecting.current?.abort()
    connecting.current = null
    unsubscribe.current?.()
    unsubscribe.current = null
    void session.current?.close()
    session.current = null
  }, [])

  /** Back to the screen before anything connected, with no ending, no failure and no thread. */
  const resetCall = useCallback(() => {
    setAgent('connecting')
    setEnded(null)
    setFailed(false)
    setInput(null)
    setMessages([])
  }, [])

  /**
   * Where the hour stands once a session has ended on its own. On its cap the
   * ticket spent all it was given, which was all that was left, so its answer
   * already says when the hour is back, unless the hour turned during the
   * call. Otherwise the ending keeps its ordinary shape until the server
   * says, which it is asked a few seconds on (`use-call-budget.ts`).
   */
  const settleEnding = useCallback(
    (reason: VoiceEndReason, hour: VoiceBudget) => {
      if (reason === 'timeout' && hour.resets_at !== null && hour.resets_at > Date.now()) {
        setBudget({ remaining_ms: 0, resets_at: hour.resets_at })
        return
      }
      refreshBudgetAfterCall()
    },
    [setBudget, refreshBudgetAfterCall],
  )

  const startCall = useCallback((challenge: (signal: AbortSignal) => Promise<string>) => {
    endSession()
    const id = turn.current
    resetCall()
    if (budget !== null && budget.remainingMs <= 0) {
      // Nothing to connect with: the consent slot's place says when to come back.
      setAwaitingConsent(true)
      return
    }
    // A budget read still going, from the slot just left, would answer after
    // the ticket and stand for an hour the ticket has already charged.
    stopBudgetRead()
    const controller = new AbortController()
    connecting.current = controller
    setAwaitingConsent(false)

    const attach = (next: VoiceSession, nextInput: VoiceInput) => {
      if (turn.current !== id) {
        void next.close()
        return
      }
      connecting.current = null
      session.current = next
      setInput(nextInput)
      unsubscribe.current = next.subscribe((event) => {
        if (event.type === 'state') {
          setAgent(event.state)
          return
        }
        if (event.type === 'message') {
          const id = nextLineId.current++
          setMessages((lines) => [...lines, { id, from: event.from, text: event.text }])
          return
        }
        if (event.reason === 'user') return
        // Ended on its own: the screen stays open on the ending. Dropping the
        // session stills the orb (no amplitude), and `connecting` stops its
        // synthetic pulse should she have been mid-sentence.
        unsubscribe.current?.()
        unsubscribe.current = null
        session.current = null
        void next.close()
        settleEnding(event.reason, next.budget)
        setAgent('connecting')
        setEnded(event.reason)
      })
      // A tap on the mic button while still connecting lands here, not in the void.
      if (!micRef.current) void next.setMicEnabled(false)
    }

    const fail = () => {
      if (turn.current !== id) return
      connecting.current = null
      setFailed(true)
    }

    /**
     * Any rejection but the microphone's. A ticket refused for a spent hour is
     * not a failed call: the screen goes back to consent in its spent shape.
     * The refusal says no more than its code, so when the hour is back comes
     * from a read, and a read that fails too leaves the call failed.
     */
    const refused = (err: unknown) => {
      if (turn.current !== id) return
      if (!isApiError(err) || err.code !== 'budget_spent') {
        fail()
        return
      }
      connecting.current = null
      setBudget(null)
      void refreshBudget({ recheckSpent: true }).then((outcome) => {
        if (turn.current !== id || outcome === 'canceled') return
        if (outcome === 'failed') {
          fail()
          return
        }
        setInput(null)
        setAwaitingConsent(true)
      })
    }

    const connect = (nextInput: VoiceInput) =>
      api.voice.connect({ mode: 'landing-demo', input: nextInput, signal: controller.signal, challenge })

    // Called in the tap's own turn: the microphone prompt needs the gesture.
    void connect('voice').then(
      (next) => {
        attach(next, 'voice')
      },
      (err: unknown) => {
        if (turn.current !== id) return
        if (!isApiError(err) || err.code !== 'microphone_unavailable') {
          refused(err)
          return
        }
        // The screen turns typed now, not once the text session arrives: a
        // visitor about to type is never shown the call's "always by voice" line.
        setInput('text')
        void connect('text').then(
          (next) => {
            attach(next, 'text')
          },
          refused,
        )
      },
    )
  }, [endSession, resetCall, budget, stopBudgetRead, settleEnding, setBudget, refreshBudget])

  const openCall = useCallback(
    (returnFocusTo?: HTMLElement | null) => {
      if (open) return
      opener.current = returnFocusTo ?? null
      setOpen(true)
      // Every call starts with the microphone on; the last call's toggle does not carry over.
      micRef.current = true
      setMic(true)
      endSession()
      resetCall()
      // The slot opens at once, in its ordinary shape; the answer may add a
      // line or swap it for the spent shape.
      setBudget(null)
      void refreshBudget()
      setAwaitingConsent(true)
    },
    [open, endSession, resetCall, setBudget, refreshBudget],
  )

  const closeCall = useCallback(() => {
    endSession()
    setOpen(false)
    setAwaitingConsent(false)
    resetCall()
  }, [endSession, resetCall])

  const ask = useCallback((text: string) => {
    if (!text.trim()) return
    session.current?.sendText(text)
  }, [])

  const noteActivity = useCallback(() => {
    session.current?.noteActivity()
  }, [])

  const toggleMic = useCallback(() => {
    const next = !micRef.current
    micRef.current = next
    setMic(next)
    void session.current?.setMicEnabled(next)
  }, [])

  const getAmplitude = useCallback(() => session.current?.getAmplitude() ?? null, [])

  const returnFocusTo = useCallback(() => opener.current, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCall()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [open, closeCall])

  // The page behind the call does not scroll. The cleanup restores whatever was
  // there before, so an unmount or a hot reload never leaves it locked.
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const previous = html.getAttribute(SCROLL_LOCK)
    html.setAttribute(SCROLL_LOCK, '')
    return () => {
      if (previous === null) html.removeAttribute(SCROLL_LOCK)
      else html.setAttribute(SCROLL_LOCK, previous)
    }
  }, [open])

  // Leaving the page ends the call as the close button does, so the
  // conversation does not run on to its cap behind a tab that is gone. Nothing
  // is recorded here: the server learns the call's length from ElevenLabs.
  useEffect(() => {
    if (!open) return
    window.addEventListener('pagehide', closeCall)
    return () => {
      window.removeEventListener('pagehide', closeCall)
    }
  }, [open, closeCall])

  // The session, and the connection it holds, close with the layout that owns them.
  useEffect(() => endSession, [endSession])

  return useMemo(
    () => ({
      open,
      agent,
      mic,
      ended,
      awaitingConsent,
      input,
      messages,
      failed,
      budget,
      openCall,
      startCall,
      closeCall,
      returnFocusTo,
      ask,
      noteActivity,
      toggleMic,
      getAmplitude,
    }),
    [
      open,
      agent,
      mic,
      ended,
      awaitingConsent,
      input,
      messages,
      failed,
      budget,
      openCall,
      startCall,
      closeCall,
      returnFocusTo,
      ask,
      noteActivity,
      toggleMic,
      getAmplitude,
    ],
  )
}
