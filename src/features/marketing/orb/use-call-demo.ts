import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, isApiError, isLive, primeGreeting, scriptedVoiceSession } from '@/api'
import type { PrimedGreeting, VoiceEndReason, VoiceSession } from '@/api'
import type { AgentState } from './call-state'

/*
 * The "Nghe thử" call. Everything the receptionist does comes from a
 * `VoiceSession` (`api.voice`): the scripted one — Linh's recorded greeting,
 * then a script — in mock mode, the ElevenLabs agent when the group is live.
 *
 * - Live, the call opens on a consent line and connects only on its button:
 *   the visitor's voice is personal data and leaves the country, so the
 *   microphone prompt and the token request start inside that tap, never on
 *   the orb click (ADR 0006 point 8). In mock mode no microphone is opened,
 *   and the call connects inside the click that opened it, as before.
 * - When `connect` rejects, for any reason, the call carries on with the
 *   scripted session: the visitor has not been promised anything a recording
 *   cannot keep (ADR 0006 point 7). The one reason the screen names is a
 *   refused microphone, because otherwise a recording answering would read
 *   as Linh ignoring them. The fallback's greeting is primed inside the tap,
 *   before anything is awaited: by the time `connect` rejects, Safari no
 *   longer counts the tap as the gesture its autoplay needs.
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
  /** Live only: the call is open on the consent line and nothing is connected yet. */
  awaitingConsent: boolean
  /** The browser refused the microphone, so the scripted session is answering. */
  micDenied: boolean
  /**
   * Call from inside the click: it is the gesture the greeting's autoplay needs.
   * `returnFocusTo` is the control focus goes back to when the call closes;
   * without one, or once it has left the page, focus goes to the orb.
   */
  openCall: (returnFocusTo?: HTMLElement | null) => void
  /**
   * Connects. Called from the consent button and from "Gọi lại", inside the
   * tap: the microphone prompt and the greeting's autoplay both need it.
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
  const [micDenied, setMicDenied] = useState(false)

  const session = useRef<VoiceSession | null>(null)
  const unsubscribe = useRef<(() => void) | null>(null)
  const connecting = useRef<AbortController | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  /** Mirrors `mic` for the session calls, so two quick taps never read the same stale value. */
  const micRef = useRef(true)
  /** Bumped by every open and close, so a session that arrives for an earlier call is closed unheard. */
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

  /**
   * Connects a new session for the open call, replacing whatever was there.
   * `greeting` is the fallback's, primed by the caller inside the tap; it is
   * released unused when `connect` resolves.
   */
  // `greeting` is the player primed inside the tap, for a fallback that arrives
  // after the microphone prompt has used up the gesture; the mock rejects in the
  // same tick and needs none, so it passes `null` and the scripted session builds its own.
  const connectCall = useCallback((greeting: PrimedGreeting | null) => {
    endSession()
    const id = turn.current
    const controller = new AbortController()
    connecting.current = controller
    setAwaitingConsent(false)
    setAgent('connecting')
    setEnded(null)
    setMicDenied(false)

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

    // Called in the tap's own turn: the scripted session starts the greeting
    // synchronously inside `connect`, while the gesture still counts.
    void api.voice.connect({ mode: 'landing-demo', signal: controller.signal }).then(
      (next) => {
        greeting?.dispose()
        attach(next)
      },
      (err: unknown) => {
        if (turn.current !== id) {
          greeting?.dispose()
          return
        }
        if (isApiError(err) && err.code === 'microphone_denied') setMicDenied(true)
        attach(scriptedVoiceSession(greeting ? { createPlayer: greeting.createPlayer } : {}))
      },
    )
  }, [endSession])

  const startCall = useCallback(() => {
    connectCall(primeGreeting())
  }, [connectCall])

  const openCall = useCallback(
    (returnFocusTo?: HTMLElement | null) => {
      if (open) return
      opener.current = returnFocusTo ?? null
      setOpen(true)
      // Every call starts with the microphone on; the last call's toggle does not carry over.
      micRef.current = true
      setMic(true)
      if (isLive('voice')) {
        endSession()
        setAgent('connecting')
        setEnded(null)
        setMicDenied(false)
        setAwaitingConsent(true)
        return
      }
      connectCall(null)
    },
    [open, endSession, connectCall],
  )

  const closeCall = useCallback(() => {
    endSession()
    setOpen(false)
    setAgent('connecting')
    setEnded(null)
    setAwaitingConsent(false)
    setMicDenied(false)
  }, [endSession])

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

  // The session, and the AudioContext it may hold, close with the layout that owns them.
  useEffect(() => endSession, [endSession])

  return useMemo(
    () => ({
      open,
      agent,
      mic,
      ended,
      awaitingConsent,
      micDenied,
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
      micDenied,
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
