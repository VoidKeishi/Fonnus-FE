import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, scriptedVoiceSession } from '@/api'
import type { VoiceEndReason, VoiceSession } from '@/api'
import type { AgentState } from './call-state'

/*
 * The "Nghe thử" call. Everything the receptionist does comes from a
 * `VoiceSession` (`api.voice`): the scripted one — Linh's recorded greeting,
 * then a script — in mock mode, a live one when the group is live. When
 * `connect` rejects, for any reason, the call carries on with the scripted
 * session, silently: the visitor has not been promised anything a recording
 * cannot keep (ADR 0006 point 7). Neither this hook nor the screen knows which
 * session it got.
 */

/** Set on <html> while the call is open; `globals.css` turns it into the scroll lock. */
const SCROLL_LOCK = 'data-scroll-lock'

export interface CallDemo {
  open: boolean
  agent: AgentState
  mic: boolean
  /** Why the session ended on its own, or null while it has not. Not rendered yet. */
  ended: VoiceEndReason | null
  /**
   * Call from inside the click: it is the gesture the greeting's autoplay needs.
   * `returnFocusTo` is the control focus goes back to when the call closes;
   * without one, or once it has left the page, focus goes to the orb.
   */
  openCall: (returnFocusTo?: HTMLElement | null) => void
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

  const session = useRef<VoiceSession | null>(null)
  const unsubscribe = useRef<(() => void) | null>(null)
  const connecting = useRef<AbortController | null>(null)
  const opener = useRef<HTMLElement | null>(null)
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

  const openCall = useCallback(
    (returnFocusTo?: HTMLElement | null) => {
      if (open) return
      opener.current = returnFocusTo ?? null
      endSession()
      const id = turn.current
      const controller = new AbortController()
      connecting.current = controller
      setOpen(true)
      setAgent('connecting')
      setEnded(null)

      const attach = (next: VoiceSession) => {
        if (turn.current !== id) {
          void next.close()
          return
        }
        connecting.current = null
        session.current = next
        unsubscribe.current = next.subscribe((event) => {
          if (event.type === 'state') setAgent(event.state)
          else setEnded(event.reason)
        })
      }

      // Called in the click's own turn: the scripted session starts the
      // greeting synchronously inside `connect`, while the gesture still counts.
      void api.voice.connect({ mode: 'landing-demo', signal: controller.signal }).then(attach, () => {
        if (turn.current !== id) return
        attach(scriptedVoiceSession())
      })
    },
    [open, endSession],
  )

  const closeCall = useCallback(() => {
    endSession()
    setOpen(false)
    setAgent('connecting')
    setEnded(null)
  }, [endSession])

  const ask = useCallback((text: string) => {
    if (!text.trim()) return
    session.current?.sendText(text)
  }, [])

  const toggleMic = useCallback(() => {
    const next = !mic
    setMic(next)
    void session.current?.setMicEnabled(next)
  }, [mic])

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
      openCall,
      closeCall,
      returnFocusTo,
      ask,
      toggleMic,
      getAmplitude,
    }),
    [open, agent, mic, ended, openCall, closeCall, returnFocusTo, ask, toggleMic, getAmplitude],
  )
}
