import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TYPED_SPEAK_MS, VOICE_PREVIEW_MS } from '@/data/call-demo'
import type { AgentState } from './call-state'
import { GreetingPlayer } from './greeting-player'

/*
 * The "Nghe thử" call, entirely in the browser: Linh's recorded greeting, then
 * a script. There is no voice session behind it and no network call — Fonnus-BE
 * has no endpoint, and none is built until a per-IP budget exists
 * (`docs/open-questions.md` Q21). A question only decides how long she stays in
 * `speaking`.
 */

/*
 * The fallback beat, used only when the greeting does not play: the browser
 * refused it (autoplay policy, missing codec) or it did not start in time (a
 * stalled download). With audio, the recording's own length decides how long
 * she speaks.
 */
const GREETING_DELAY_MS = 1600
const GREETING_HOLD_MS = 5200

/** Set on <html> while the call is open; `globals.css` turns it into the scroll lock. */
const SCROLL_LOCK = 'data-scroll-lock'

export interface CallDemo {
  open: boolean
  agent: AgentState
  mic: boolean
  /** Index into `VOICES`. */
  voice: number
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
  /** Auditions a voice without selecting it. */
  previewVoice: () => void
  toggleMic: () => void
  setVoice: (index: number) => void
  /**
   * Live loudness of the greeting, 0–1, or null when no audio is playing.
   * Polled from the orb's animation frame, never pushed through React state:
   * a 60fps signal there would re-render every consumer each frame.
   */
  getAmplitude: () => number | null
}

export function useCallDemoState(): CallDemo {
  const [open, setOpen] = useState(false)
  const [agent, setAgent] = useState<AgentState>('ringing')
  const [mic, setMic] = useState(true)
  const [voice, setVoice] = useState(0)

  const player = useRef<GreetingPlayer | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  /** Bumped by every open, close and question, so a late answer to an earlier one is ignored. */
  const turn = useRef(0)

  const after = useCallback((ms: number, then: () => void) => {
    timers.current.push(setTimeout(then, ms))
  }, [])

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer)
    timers.current = []
  }, [])

  /** Cuts off whatever she is saying and starts a new turn. */
  const interrupt = useCallback(() => {
    turn.current += 1
    clearTimers()
    player.current?.stop()
    return turn.current
  }, [clearTimers])

  const speakFor = useCallback(
    (ms: number) => {
      interrupt()
      setAgent('speaking')
      after(ms, () => {
        setAgent('listening')
      })
    },
    [interrupt, after],
  )

  const openCall = useCallback(
    (returnFocusTo?: HTMLElement | null) => {
      if (open) return
      opener.current = returnFocusTo ?? null
      const id = interrupt()
      setOpen(true)
      // She is already talking: the click that opened the screen is the gesture
      // autoplay needs, so there is nothing left to ask for.
      setAgent('speaking')
      player.current ??= new GreetingPlayer(() => {
        setAgent('listening')
      })
      void player.current.play().then((started) => {
        if (started || turn.current !== id) return
        // Refused or stalled: ring, then speak for a scripted beat, so the
        // screen is never both silent and frozen.
        setAgent('ringing')
        after(GREETING_DELAY_MS, () => {
          setAgent('speaking')
          after(GREETING_HOLD_MS, () => {
            setAgent('listening')
          })
        })
      })
    },
    [open, interrupt, after],
  )

  const closeCall = useCallback(() => {
    interrupt()
    setOpen(false)
    setAgent('ringing')
  }, [interrupt])

  const ask = useCallback(
    (text: string) => {
      if (!text.trim()) return
      speakFor(TYPED_SPEAK_MS)
    },
    [speakFor],
  )

  const previewVoice = useCallback(() => {
    speakFor(VOICE_PREVIEW_MS)
  }, [speakFor])

  // Nothing to switch on: the demo never opens a microphone. Only the label changes.
  const toggleMic = useCallback(() => {
    setMic((on) => !on)
  }, [])

  const getAmplitude = useCallback(() => player.current?.getAmplitude() ?? null, [])

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

  // The one AudioContext is closed with the layout that owns it.
  useEffect(() => {
    const owned = player
    return () => {
      clearTimers()
      owned.current?.dispose()
      owned.current = null
    }
  }, [clearTimers])

  return useMemo(
    () => ({
      open,
      agent,
      mic,
      voice,
      openCall,
      closeCall,
      returnFocusTo,
      ask,
      previewVoice,
      toggleMic,
      setVoice,
      getAmplitude,
    }),
    [open, agent, mic, voice, openCall, closeCall, returnFocusTo, ask, previewVoice, toggleMic, getAmplitude],
  )
}
