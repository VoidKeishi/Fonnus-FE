import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/api'
import type { VoiceEndReason, VoiceSession } from '@/api'
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
 * - Any rejection is a failed call, and the screen says so; nothing
 *   stands in for the agent.
 * - A session that ends on its own — the agent hung up, the duration cap, a
 *   dropped connection — leaves the screen open on its ending, which offers
 *   to call again.
 */

/** Set on <html> while the call is open; `globals.css` turns it into the scroll lock. */
const SCROLL_LOCK = 'data-scroll-lock'

export interface CallDemo {
  open: boolean
  agent: AgentState
  mic: boolean
  /** Why the session ended on its own (never `user`), or null while it has not. */
  ended: VoiceEndReason | null
  /** The call is open on the consent line and nothing is connected yet. */
  awaitingConsent: boolean
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
  const [failed, setFailed] = useState(false)

  const session = useRef<VoiceSession | null>(null)
  const unsubscribe = useRef<(() => void) | null>(null)
  const connecting = useRef<AbortController | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  /** Mirrors `mic` for the session calls, so two quick taps never read the same stale value. */
  const micRef = useRef(true)
  /** Bumped by every open, connect and close, so a session that arrives for an earlier call is closed unheard. */
  const turn = useRef(0)

  const endSession = useCallback(() => {
    turn.current += 1
    connecting.current?.abort()
    connecting.current = null
    unsubscribe.current?.()
    unsubscribe.current = null
    void session.current?.close()
    session.current = null
  }, [])

  /** Back to the screen before anything connected, with no ending and no failure. */
  const resetCall = useCallback(() => {
    setAgent('connecting')
    setEnded(null)
    setFailed(false)
  }, [])

  const startCall = useCallback(() => {
    endSession()
    const id = turn.current
    const controller = new AbortController()
    connecting.current = controller
    setAwaitingConsent(false)
    resetCall()

    const attach = (next: VoiceSession) => {
      if (turn.current !== id) {
        void next.close()
        return
      }
      connecting.current = null
      session.current = next
      unsubscribe.current = next.subscribe((event) => {
        if (event.type === 'state') {
          setAgent(event.state)
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

    // Called in the tap's own turn: the microphone prompt needs the gesture.
    void api.voice.connect({ mode: 'landing-demo', signal: controller.signal }).then(
      (next) => {
        attach(next)
      },
      fail,
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
