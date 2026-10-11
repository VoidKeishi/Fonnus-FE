/**
 * The scripted voice session: Linh's recorded greeting, then "listening". No
 * microphone is opened and nothing is sent anywhere; a question only decides
 * how long she stays in `speaking`.
 *
 * It is `voice.mock.ts`'s session, and the one the call demo falls back to
 * whenever `api.voice.connect` rejects (ADR 0006 point 7), which is why it is
 * exported from `index.ts` rather than living behind the mock alone.
 *
 * Imports neither `http.ts` nor `mock-support.ts`, and touches no browser API
 * until a session is created — inside the click that opens the call.
 */
import type { VoiceAgentState, VoiceEvent, VoiceSession } from './contracts'

/*
 * The fallback beat, used only when the greeting does not play: the browser
 * refused it (autoplay policy, missing codec) or it did not start in time (a
 * stalled download). With audio, the recording's own length decides how long
 * she speaks.
 */
const GREETING_DELAY_MS = 1600
const GREETING_HOLD_MS = 5200
/** How long a typed question or a chip makes her speak. */
const TYPED_SPEAK_MS = 4400

/** What the session needs from the greeting. The real one is `GreetingPlayer`; tests hand in a stub. */
export interface ScriptedPlayer {
  /** Starts from the top. Resolves false if the browser refused or it did not start in time. */
  play(): Promise<boolean>
  stop(): void
  dispose(): void
  getAmplitude(): number | null
}

export interface ScriptedDeps {
  /** Builds the player; `onEnded` fires once when the greeting has played to its end. */
  createPlayer?: (onEnded: () => void) => ScriptedPlayer
}

/**
 * Creates the session and starts the greeting in the same synchronous turn, so
 * a caller inside a click keeps the gesture autoplay needs.
 */
export function scriptedVoiceSession({ createPlayer = (onEnded) => new GreetingPlayer(onEnded) }: ScriptedDeps = {}): VoiceSession {
  const listeners = new Set<(event: VoiceEvent) => void>()
  let latest: VoiceEvent = { type: 'state', state: 'connecting' }
  let closed = false
  let timers: ReturnType<typeof setTimeout>[] = []
  /** Bumped by every question and by `close()`, so a late answer to an earlier one is ignored. */
  let turn = 0

  const emit = (event: VoiceEvent) => {
    if (closed) return
    latest = event
    for (const listener of [...listeners]) listener(event)
  }
  const setState = (state: VoiceAgentState) => {
    emit({ type: 'state', state })
  }
  const after = (ms: number, then: () => void) => {
    timers.push(setTimeout(then, ms))
  }

  const player = createPlayer(() => {
    setState('listening')
  })

  /** Cuts off whatever she is saying and starts a new turn. */
  const interrupt = () => {
    turn += 1
    for (const timer of timers) clearTimeout(timer)
    timers = []
    player.stop()
  }

  // She is already talking: the click that created the session is the gesture
  // autoplay needs, so there is nothing left to ask for.
  const greetingTurn = turn
  setState('speaking')
  void player.play().then((started) => {
    if (started || closed || turn !== greetingTurn) return
    // Refused or stalled: connect, then speak for a scripted beat, so the
    // screen is never both silent and frozen.
    setState('connecting')
    after(GREETING_DELAY_MS, () => {
      setState('speaking')
      after(GREETING_HOLD_MS, () => {
        setState('listening')
      })
    })
  })

  return {
    subscribe(listener) {
      if (closed) return () => undefined
      listeners.add(listener)
      listener(latest)
      return () => {
        listeners.delete(listener)
      }
    },

    // Nothing to switch on: the scripted session never opens a microphone.
    setMicEnabled() {
      return Promise.resolve()
    },

    sendText(text) {
      if (closed || !text.trim()) return
      // Asking something cuts the greeting off rather than talking over it.
      interrupt()
      setState('speaking')
      after(TYPED_SPEAK_MS, () => {
        setState('listening')
      })
    },

    getAmplitude() {
      return player.getAmplitude()
    },

    close() {
      if (closed) return Promise.resolve()
      interrupt()
      player.dispose()
      // The scripted session never ends on its own, so this is the one `ended`.
      emit({ type: 'ended', reason: 'user' })
      closed = true
      listeners.clear()
      return Promise.resolve()
    },
  }
}

/**
 * Loudness, 0–1, of one analyser frame of 8-bit samples centred on 128. Speech
 * RMS rarely passes ~0.35, so it is scaled before clamping or the waves would
 * barely move.
 */
export function speechLevel(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i += 1) {
    const v = ((samples[i] ?? 128) - 128) / 128
    sum += v * v
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 3.2)
}

/*
 * The greeting's loudness is smoothed once here, as a rising and a falling
 * share of the gap closed per frame, before the orb smooths it again with its
 * own envelope (`orb-motion.ts`). Both passes are what the waves were tuned on.
 */
const ENVELOPE_ATTACK = 0.5
const ENVELOPE_RELEASE = 0.12

/**
 * Linh's recorded greeting, and the live loudness the orb's waves ride on.
 * One per session.
 *
 * - Everything is built lazily, inside the click that opens the call. An
 *   AudioContext created before a gesture starts suspended, and Safari never
 *   resumes one on its own; `play()` therefore calls `resume()` and the media
 *   element's `play()` in the same synchronous turn, awaiting neither first.
 * - One media element and one context, closed by `dispose()`.
 *   `createMediaElementSource` may only be called once per element. There is no
 *   `fetch` here: the element loads the file itself.
 * - The analyser is a tap, not a pass-through: it has to be connected to the
 *   destination or the page goes silent.
 * - `play()` resolving is not a promise that `ended` will ever fire. A stalled
 *   element, a background tab, a missing audio device — any of them would leave
 *   her "speaking" for ever. Hence the watchdog.
 * - Nor does the element's `play()` ever have to settle: on a download that
 *   stalls before the first frame it stays pending. Hence the start timeout,
 *   after which the attempt is abandoned and the session scripts the beat.
 */
const GREETING_SRC = '/audio/linh-greeting.wav'
/** Cap for the watchdog while the clip's real length is not known yet. */
const MAX_GREETING_MS = 12_000
/** Slack past the clip's own length before the watchdog gives up on `ended`. */
const WATCHDOG_SLACK_MS = 1500
/*
 * How long the greeting may take to start before it counts as refused. The
 * clip is small enough to start well inside this on a phone connection; past
 * it she has been "speaking" in silence long enough to read as broken.
 */
const START_TIMEOUT_MS = 4000

type AudioContextCtor = typeof AudioContext

class GreetingPlayer implements ScriptedPlayer {
  private audio: HTMLAudioElement | null = null
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private samples: Uint8Array<ArrayBuffer> | null = null
  /** Whether this element has been routed through an analyser; that may happen once. */
  private wired = false
  private envelope = 0
  private playing = false
  private watchdog: ReturnType<typeof setTimeout> | undefined
  private startTimer: ReturnType<typeof setTimeout> | undefined
  /** Bumped by every `play()` and `stop()`, so an abandoned attempt settling late changes nothing. */
  private attempt = 0

  constructor(private readonly onEnded: () => void) {}

  play(): Promise<boolean> {
    const audio = this.element()
    this.connect(audio)
    void this.ctx?.resume().catch(() => undefined)

    this.attempt += 1
    const attempt = this.attempt
    clearTimeout(this.startTimer)
    audio.currentTime = 0
    this.envelope = 0
    return new Promise<boolean>((resolve) => {
      const settle = (started: boolean) => {
        if (attempt !== this.attempt) {
          resolve(false)
          return
        }
        clearTimeout(this.startTimer)
        this.playing = started
        if (started) this.armWatchdog()
        resolve(started)
      }
      this.startTimer = setTimeout(() => {
        // Abandoned before pausing: the pause rejects the pending play(), and
        // that late settle must find this attempt already over.
        this.attempt += 1
        audio.pause()
        resolve(false)
      }, START_TIMEOUT_MS)
      audio.play().then(
        () => {
          settle(true)
        },
        () => {
          settle(false)
        },
      )
    })
  }

  stop(): void {
    this.attempt += 1
    clearTimeout(this.startTimer)
    clearTimeout(this.watchdog)
    this.playing = false
    this.envelope = 0
    // Nothing else plays through the context; the next `play()` resumes it.
    void this.ctx?.suspend().catch(() => undefined)
    if (!this.audio) return
    this.audio.pause()
    this.audio.currentTime = 0
  }

  dispose(): void {
    this.stop()
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null
    this.analyser = null
    this.samples = null
    this.audio = null
    this.wired = false
  }

  getAmplitude(): number | null {
    if (!this.playing || !this.analyser || !this.samples) return null
    this.analyser.getByteTimeDomainData(this.samples)
    const target = speechLevel(this.samples)
    this.envelope += (target - this.envelope) * (target > this.envelope ? ENVELOPE_ATTACK : ENVELOPE_RELEASE)
    return this.envelope
  }

  private element(): HTMLAudioElement {
    if (this.audio) return this.audio
    const audio = new Audio(GREETING_SRC)
    audio.preload = 'auto'
    audio.addEventListener('ended', () => {
      this.finish()
    })
    // Metadata usually arrives after play() starts, so re-arm on the real length.
    audio.addEventListener('loadedmetadata', () => {
      if (this.playing) this.armWatchdog()
    })
    this.audio = audio
    return audio
  }

  private connect(audio: HTMLAudioElement): void {
    if (this.wired) return
    this.wired = true
    // Older Safari only has the prefixed constructor.
    const scope = window as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
    const Ctor = scope.AudioContext ?? scope.webkitAudioContext
    if (!Ctor) return
    try {
      const ctx = new Ctor()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaElementSource(audio).connect(analyser)
      analyser.connect(ctx.destination)
      this.ctx = ctx
      this.analyser = analyser
      this.samples = new Uint8Array(new ArrayBuffer(analyser.fftSize))
    } catch {
      // No Web Audio: the greeting still plays, and the waves fall back to
      // their synthetic pulse.
    }
  }

  private finish(): void {
    if (!this.playing) return
    this.stop()
    this.onEnded()
  }

  /** Arm on the clip's own length once known, else on the hard cap. */
  private armWatchdog(): void {
    clearTimeout(this.watchdog)
    const known = this.audio?.duration
    const ms = known && Number.isFinite(known) && known > 0 ? known * 1000 + WATCHDOG_SLACK_MS : MAX_GREETING_MS
    this.watchdog = setTimeout(() => {
      this.finish()
    }, ms)
  }
}
