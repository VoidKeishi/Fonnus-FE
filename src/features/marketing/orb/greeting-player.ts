import { GREETING_ENVELOPE, envelopeStep, speechLevel } from './orb-motion'

/**
 * Linh's recorded greeting, and the live loudness the orb's waves ride on.
 * Outside React: the call demo owns one for the life of the marketing layout.
 *
 * - Everything is built lazily, inside the click that opens the call. An
 *   AudioContext created before a gesture starts suspended, and Safari never
 *   resumes one on its own; `play()` therefore calls `resume()` and the media
 *   element's `play()` in the same synchronous turn, awaiting neither first.
 * - One media element and one context, kept across calls (the context is
 *   suspended while silent) and closed only by `dispose()`. The element holds
 *   the downloaded file, so a second call plays from it instead of downloading
 *   again — and `createMediaElementSource` may only be called once per element
 *   anyway. There is no `fetch` here: the element loads the file itself, and
 *   `fetch` belongs to `src/api/` alone.
 * - The analyser is a tap, not a pass-through: it has to be connected to the
 *   destination or the page goes silent.
 * - `play()` resolving is not a promise that `ended` will ever fire. A stalled
 *   element, a background tab, a missing audio device — any of them would leave
 *   her "speaking" for ever. Hence the watchdog.
 * - Nor does the element's `play()` ever have to settle: on a download that
 *   stalls before the first frame it stays pending. Hence the start timeout,
 *   after which the attempt is abandoned and the caller scripts the beat.
 *
 * No microphone is ever opened and nothing is sent anywhere.
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

export class GreetingPlayer {
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

  /**
   * Starts the greeting from the top. Call it from inside the user's gesture.
   * Resolves false if the browser refused to play or playback did not start
   * within `START_TIMEOUT_MS`; the caller then scripts the beat instead.
   */
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

  /** 0–1 right now, or null when nothing is playing. Read from the orb's animation frame. */
  getAmplitude(): number | null {
    if (!this.playing || !this.analyser || !this.samples) return null
    this.analyser.getByteTimeDomainData(this.samples)
    this.envelope = envelopeStep(this.envelope, speechLevel(this.samples), GREETING_ENVELOPE)
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
