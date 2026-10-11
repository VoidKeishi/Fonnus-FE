import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, isApiError } from '@/api'
import type { VoiceEndReason, VoiceInput, VoiceSession } from '@/api'
import type { AgentState } from './call-state'

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
 *   to call again.
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
   * Opens the call screen on the consent line. `returnFocusTo` is the control
   * focus goes back to when the call closes; without one, or once it has left
   * the page, focus goes to the orb.
   */
  openCall: (returnFocusTo?: HTMLElement | null) => void
  /**
   * Connects. Called from the consent button and from "Gọi lại", inside the
   * tap: the microphone prompt needs it.
   */
  startCall: () => void
  closeCall: () => void
  /** The control the current call was opened from, as handed to `openCall`. */
  returnFocusTo: () => HTMLElement | null
  /** A suggestion chip or the typed box. */
  ask: (text: string) => void
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

  const startCall = useCallback(() => {
    endSession()
    const id = turn.current
    const controller = new AbortController()
    connecting.current = controller
    setAwaitingConsent(false)
    resetCall()

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

    const connect = (nextInput: VoiceInput) =>
      api.voice.connect({ mode: 'landing-demo', input: nextInput, signal: controller.signal })

    // Called in the tap's own turn: the microphone prompt needs the gesture.
    void connect('voice').then(
      (next) => {
        attach(next, 'voice')
      },
      (err: unknown) => {
        if (turn.current !== id) return
        if (!isApiError(err) || err.code !== 'microphone_unavailable') {
          fail()
          return
        }
        // The screen turns typed now, not once the text session arrives: a
        // visitor about to type is never shown the call's "always by voice" line.
        setInput('text')
        void connect('text').then(
          (next) => {
            attach(next, 'text')
          },
          fail,
        )
      },
    )
  }, [endSession, resetCall])

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
      setAwaitingConsent(true)
    },
    [open, endSession, resetCall],
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
      openCall,
      startCall,
      closeCall,
      returnFocusTo,
      ask,
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
      openCall,
      startCall,
      closeCall,
      returnFocusTo,
      ask,
      toggleMic,
      getAmplitude,
    ],
  )
}
