'use client'

import { createContext, use, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/design-system'
import type { CallDemo } from '@/data/call-demos'
import {
  actionReached,
  elapsedOnRecording,
  elapsedSince,
  formatClock,
  isBarPlayed,
  isFinished,
  progressAt,
  turnsHeard,
} from './call-demo-timeline'

/** The clock ticks 10×/second while a call plays; the bar's 100ms transition smooths between ticks. */
const TICK_MS = 100

/*
 * How long a recording may take to start before the call carries on without
 * it, as the orb's greeting does (`../orb/greeting-player.ts`): `play()` on a
 * download that stalls before its first frame never settles at all.
 */
const START_TIMEOUT_MS = 4000

/** Where the clock is read from: the recording, or a silent timer once the recording would not start. */
type Voice = 'recording' | 'silent'

/** Deterministic bar heights — a waveform should look like audio, not noise. */
const BARS = [
  0.32, 0.5, 0.72, 0.44, 0.86, 0.62, 0.95, 0.55, 0.38, 0.7, 0.88, 0.46, 0.66, 0.92, 0.58, 0.34, 0.76, 0.5, 0.82, 0.4,
  0.68, 0.9, 0.52, 0.36,
]

interface Playback {
  /** The demo playing, or null when every call is paused. */
  playingId: string | null
  play: (id: string) => void
  /** Pauses `id` if it is the one playing; a no-op otherwise. */
  pause: (id: string) => void
}

const PlaybackContext = createContext<Playback | null>(null)

/**
 * One sample call plays at a time: starting one pauses whichever was playing,
 * or two recordings would talk over each other. The rows between the players
 * are server-rendered and pass through as `children`.
 */
export function OneCallAtATime({ children }: { children: ReactNode }) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const play = useCallback((id: string) => {
    setPlayingId(id)
  }, [])
  const pause = useCallback((id: string) => {
    setPlayingId((current) => (current === id ? null : current))
  }, [])

  // A hidden tab pauses the call where it is. Left running, the clock would
  // count on unseen and the visitor would come back to a finished call.
  useEffect(() => {
    if (playingId === null) return
    function pauseWhenHidden() {
      if (document.hidden) setPlayingId(null)
    }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [playingId])

  const value = useMemo(() => ({ playingId, play, pause }), [playingId, play, pause])
  return <PlaybackContext value={value}>{children}</PlaybackContext>
}

function usePlayback(): Playback {
  const playback = use(PlaybackContext)
  if (!playback) throw new Error('CallDemoPlayer is used outside OneCallAtATime')
  return playback
}

const WHO = { caller: 'Khách gọi', linh: 'Linh · Fonnus' } as const

interface CallDemoPlayerProps {
  demo: CallDemo
  /** What Fonnus did — a server-rendered card, shown once the call reaches `actionAt`. */
  action: ReactNode
}

/**
 * Replays one sample call: its recording plays while the transcript rolls in
 * turn by turn under a waveform and a progress bar, then the card showing what
 * Fonnus did.
 *
 * The state is how far into the call it is, and whether this run is heard.
 * While this call is the one playing, a single interval reads the recording's
 * position — so a line never lands before or after its voice, buffering
 * included — and everything on screen is derived from that number in render.
 * A recording that will not start leaves the run silent: the same interval
 * then reads `performance.now()` from where the call was, as it did before
 * there were recordings, and the recording stays off until the call is
 * replayed from the top.
 *
 * The audio element is created by the first press, not rendered: nothing is
 * downloaded until the visitor asks to listen, and Safari only lets sound
 * start inside the gesture itself. It is never in the document, so React owns
 * none of it; there is no `fetch` here. The page follows the element, not the
 * other way round: the browser's own media controls (a phone's notification,
 * a keyboard's media keys) can play or pause it without a press.
 */
export function CallDemoPlayer({ demo, action }: CallDemoPlayerProps) {
  const { playingId, play, pause } = usePlayback()
  const playing = playingId === demo.id
  const [elapsed, setElapsed] = useState(0)
  const [voice, setVoice] = useState<Voice>('recording')
  /** Null until the first press, and again once a start has failed, so the next run downloads afresh. */
  const [recording, setRecording] = useState<HTMLAudioElement | null>(null)
  /** The press's `play()`, settled to whether the recording started; never rejects. Taken by the effect it starts. */
  const startingRef = useRef<Promise<boolean> | null>(null)
  const resumeFrom = useEffectEvent(() => elapsed)

  useEffect(() => {
    if (!playing) return
    const audio = voice === 'recording' ? recording : null
    const from = resumeFrom()
    const startedAt = performance.now()

    // No pending start means the browser's media controls played it: already under way.
    const starting = startingRef.current
    startingRef.current = null
    // `current` goes false in the cleanup, so a start abandoned by a pause,
    // another call or a hidden tab never silences the run.
    let current = true
    let started = starting === null
    let startTimer: number | undefined

    // Until the recording has started the clock holds where the call was: an
    // ended element still reads as ended until the rewind its play() asks for
    // has happened, and a failed one is about to be released and rewound.
    const read = audio
      ? () => (started ? elapsedOnRecording(demo, audio.currentTime, audio.ended) : from)
      : () => elapsedSince(demo, from, startedAt, performance.now())

    if (audio && starting) {
      const fallSilent = () => {
        if (!current || started) return
        setVoice('silent')
        // A failed download is never fetched again by this element's play().
        setRecording(null)
      }
      void starting.then((ok) => {
        if (ok) started = true
        else fallSilent()
      })
      startTimer = window.setTimeout(fallSilent, START_TIMEOUT_MS)
    }

    const tick = window.setInterval(() => {
      const now = read()
      setElapsed(now)
      // The recording ends the call, not `duration`, so its tail is never cut.
      // One paused outside the page (the media controls, a phone call coming
      // in on iOS) pauses the call with it, rather than leave it showing as
      // playing.
      const over = audio ? started && (audio.ended || audio.paused) : isFinished(demo, now)
      if (over) pause(demo.id)
    }, TICK_MS)

    return () => {
      current = false
      window.clearTimeout(startTimer)
      window.clearInterval(tick)
      audio?.pause()
      // Paused by the button, by another call starting or by a hidden tab:
      // hold the exact moment, not the last tick's.
      setElapsed(read())
    }
  }, [playing, voice, recording, demo, pause])

  // Played from outside the page: it becomes the call playing, which pauses
  // any other. A run already fallen silent stays silent.
  const followPlay = useEffectEvent((audio: HTMLAudioElement) => {
    if (voice === 'silent') audio.pause()
    else if (!playing) play(demo.id)
  })

  useEffect(() => {
    if (!recording) return
    const onPlay = () => {
      followPlay(recording)
    }
    recording.addEventListener('play', onPlay)
    return () => {
      recording.removeEventListener('play', onPlay)
      // Released, not just paused: the download stops, a pending play() can
      // no longer start it late, and the browser drops its media controls.
      recording.pause()
      recording.removeAttribute('src')
      recording.load()
    }
  }, [recording])

  const finished = isFinished(demo, elapsed)

  /** Starts the recording from where the call is. Called inside the press, for Safari. */
  function startRecording(fromTop: boolean) {
    let audio = recording
    // An element whose download failed after starting is as dead as a dropped
    // one. From the top, `play()` rewinds an ended element by itself; one that
    // stopped short of its end (paused outside the page past `duration`) is
    // replaced rather than rewound, because the element is state and state is
    // not written to.
    if (!audio || audio.error || (fromTop && !audio.ended)) {
      audio = new Audio(demo.audioSrc)
      setRecording(audio)
    }
    startingRef.current = audio.play().then(
      () => true,
      () => false,
    )
  }

  function toggle() {
    if (playing) {
      pause(demo.id)
      return
    }
    if (finished) {
      setElapsed(0)
      setVoice('recording')
    }
    if (finished || voice === 'recording') startRecording(finished)
    play(demo.id)
  }

  const progress = progressAt(demo, elapsed)
  const heard = new Set(turnsHeard(demo, elapsed))

  return (
    <div className="overflow-clip rounded-lg bg-surface-card shadow-[inset_0_0_0_1px_var(--border-hairline),0_14px_40px_color-mix(in_srgb,var(--text-heading)_7%,transparent)]">
      <div className="flex items-center gap-3.5 px-[18px] py-4 max-[561px]:flex-wrap max-[561px]:gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Tạm dừng ${demo.title}` : `Phát ${demo.title}`}
          className={[
            'grid size-[46px] flex-none cursor-pointer place-items-center rounded-[50%] border-none',
            'bg-action-primary text-text-on-accent [--icon-accent:currentColor] hover:bg-action-primary-hover',
            'shadow-[0_8px_20px_color-mix(in_srgb,var(--action-primary)_28%,transparent)]',
            'transition-[background-color,scale] duration-(--duration-fast) ease-out active:scale-(--press-scale)',
          ].join(' ')}
        >
          <Icon name={playing ? 'pause' : finished ? 'arrow-right' : 'play'} size={18} />
        </button>

        {/* On a phone the waveform goes and the caller's line takes its room. */}
        <span className="flex min-w-0 flex-none flex-col gap-[3px] max-[561px]:flex-auto">
          <span className="flex items-center gap-[7px] font-num text-body-sm leading-(--leading-body) font-medium tabular-nums text-text-body">
            <span
              aria-hidden="true"
              className={`size-[7px] rounded-[50%] ${playing ? 'bg-text-eyebrow motion-safe:animate-[fnSpeakDot_1200ms_var(--ease-in-out)_infinite]' : 'bg-border-strong'}`}
            />
            {demo.caller}
          </span>
          <span className="text-ui leading-(--leading-body) whitespace-nowrap text-text-muted">{demo.title}</span>
        </span>

        {/* Bars behind the playhead are clay, ahead of it muted. The first thing
            to go on a phone: the transcript is the point. */}
        <span aria-hidden="true" className="flex h-[34px] min-w-0 flex-auto items-center gap-0.5 overflow-clip max-[561px]:hidden">
          {BARS.map((height, i) => (
            <span
              // A fixed drawing that never reorders: the position is the identity.
              key={i}
              className={[
                'min-w-0.5 flex-[1_1_0] origin-center rounded-pill',
                isBarPlayed(i, BARS.length, progress)
                  ? 'bg-text-eyebrow'
                  : 'bg-[color-mix(in_srgb,var(--text-heading)_16%,transparent)]',
                playing ? 'motion-safe:animate-[fnWaveBar_900ms_var(--ease-in-out)_infinite]' : '',
              ].join(' ')}
              style={{ height: `${String(Math.round(height * 100))}%`, animationDelay: `${String((i % 7) * 90)}ms` }}
            />
          ))}
        </span>

        <span className="flex-none font-num text-ui leading-(--leading-body) tabular-nums text-text-muted">
          {formatClock(elapsed)} / {formatClock(demo.duration)}
        </span>
      </div>

      <div aria-hidden="true" className="h-0.5 bg-border-hairline">
        <span
          className="block h-full bg-text-eyebrow transition-[width] duration-100 ease-linear"
          style={{ width: `${String(progress * 100)}%` }}
        />
      </div>

      {/* Turns and the action land here one after another as the call plays.
          Every one is in the server HTML, so a crawler that runs no JavaScript
          reads the whole call; those not reached yet are display none, out of
          the accessibility tree too. Un-hiding one is an addition the live
          region announces, and it restarts the rise animation, which is the
          roll-in. */}
      <div aria-live="polite" className="flex flex-col gap-3 p-[18px]">
        {heard.size === 0 ? (
          <p className="m-0 px-0.5 py-2.5 text-body-sm leading-(--leading-body) text-text-muted">
            Bấm ▶ để nghe lại một cuộc gọi Fonnus đã xử lý.
          </p>
        ) : null}

        {demo.turns.map((turn) => (
          <div
            key={turn.at}
            className={[
              heard.has(turn) ? '' : 'hidden',
              'max-w-[92%] rounded-md px-[15px] py-[13px] max-[561px]:max-w-full',
              'motion-safe:animate-[fnRise_320ms_var(--ease-out)_both]',
              turn.role === 'linh'
                ? 'self-end bg-surface-warm'
                : 'self-start bg-surface-page shadow-[inset_0_0_0_1px_var(--border-hairline)]',
            ].join(' ')}
          >
            <span
              className={`mb-[5px] block text-eyebrow leading-(--leading-body) font-semibold tracking-[0.06em] uppercase ${turn.role === 'linh' ? 'text-text-accent' : 'text-text-muted'}`}
            >
              {WHO[turn.role]}
            </span>
            <p className="m-0 text-body-sm leading-[1.55] text-text-body">{turn.text}</p>
          </div>
        ))}

        <div
          className={`mt-1 motion-safe:animate-[fnRise_420ms_var(--ease-out)_both] ${actionReached(demo, elapsed) ? '' : 'hidden'}`}
        >
          {action}
        </div>
      </div>
    </div>
  )
}
