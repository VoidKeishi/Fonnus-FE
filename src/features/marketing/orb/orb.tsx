import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Icon } from '@/design-system'
import { FIELD_FRAME_MS, STILL_FRAME_MS, createOrbField } from './orb-field'
import { ORB_ENVELOPE, envelopeStep } from './orb-motion'
import type { OrbMode } from './orb-motion'

/*
 * The orb is one button laid out at its base size (280px) and scaled into place
 * by `use-orb-placement.ts`. Everything inside is sized in % so it stays sharp
 * at every scale, and everything that reacts to the voice — body scale, wave
 * brightness and spread, bloom — is a calc() off one custom property, `--amp`,
 * which the animation loop below writes. Driving them from CSS rather than
 * from React state is what keeps a 60fps envelope from re-rendering the tree.
 */

/** Three reads as a ripple; more turns into a target. */
const WAVE_COUNT = 3
const WAVE_PERIOD_MS = 2600
const WAVE_STAGGER_MS = 900
/*
 * The waves mount with the call screen, so their delays are negative: each
 * ring starts mid-flight in the same phase it would hold had it been running
 * all along, 900ms behind the one before, instead of waiting at the orb's edge.
 */
const WAVES = Array.from({ length: WAVE_COUNT }, (_, i) => ({
  id: i,
  delay: -((WAVE_PERIOD_MS - i * WAVE_STAGGER_MS) % WAVE_PERIOD_MS),
}))

/** The pulse she breathes with when there is no waveform to follow. */
const SYNTHETIC_HZ = 1.1
const SYNTHETIC_MID = 0.45
const SYNTHETIC_SWING = 0.35
/** Below this, a fading `--amp` is written as 0 and the envelope stops. */
const AMP_FLOOR = 0.001

/*
 * The sphere's ground under the animated field: clay → milk. The field covers
 * it almost entirely; it shows at the blurred rim and before the first frame.
 * Three of its stops have no alias and are mixed from their neighbours.
 */
const SPHERE =
  'bg-[linear-gradient(180deg,var(--text-accent)_0%,var(--text-eyebrow)_34%,color-mix(in_srgb,var(--text-eyebrow)_70%,var(--surface-warm))_56%,color-mix(in_srgb,var(--surface-warm)_82%,var(--text-eyebrow))_76%,color-mix(in_srgb,var(--text-on-accent)_65%,var(--surface-warm))_92%,var(--text-on-accent)_100%)] ' +
  'shadow-[0_20px_70px_color-mix(in_srgb,var(--text-eyebrow)_32%,transparent)]'
/* Ambient light bleeding past the sphere's edge, brightening with the voice. */
const HALO =
  'bg-[radial-gradient(circle,color-mix(in_srgb,var(--text-eyebrow)_30%,transparent)_0%,transparent_70%)] blur-[10px] ' +
  'opacity-[calc(1+var(--amp)*0.9)] [transform:scale(calc(1+var(--amp)*0.1))] motion-reduce:[transform:none]'
/* Frosted-glass sheen near the top. */
const SHEEN =
  'bg-[radial-gradient(circle_at_50%_32%,color-mix(in_srgb,var(--text-on-accent)_12%,transparent)_0%,transparent_55%)]'
const LABEL_SHADOW =
  '[text-shadow:0_1px_3px_color-mix(in_srgb,var(--text-accent)_55%,transparent),0_2px_18px_color-mix(in_srgb,var(--text-accent)_60%,transparent)]'

interface OrbProps {
  orbRef: RefObject<HTMLButtonElement | null>
  /** Null until placed: invisible and not yet pressable. */
  mode: OrbMode | null
  /** True whenever she is talking; drives the waves. */
  speaking: boolean
  getAmplitude: () => number | null
  onClick: () => void
}

export function Orb({ orbRef, mode, speaking, getAmplitude, onClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useOrbAnimation(orbRef, canvasRef, speaking, getAmplitude)

  return (
    <button
      ref={orbRef}
      type="button"
      onClick={onClick}
      aria-label="Nghe thử Fonnus"
      // In the call it sits behind the dialog as its picture; the dialog holds focus.
      tabIndex={mode === 'call' ? -1 : undefined}
      className={[
        // `opacity`, `position` and `transform` are the placement's (use-orb-placement.ts).
        'fixed top-0 left-0 size-[280px] origin-top-left rounded-[50%] border-none bg-transparent p-0 opacity-0 will-change-transform [--amp:0]',
        mode === 'call' ? 'pointer-events-none z-70' : 'z-30',
        mode === null ? 'pointer-events-none' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* Two forces act on the waves at once: the keyframes carry each ring
          outward on its own steady beat, and --amp decides how bright and how
          far it gets. Only on the call screen. */}
      {mode === 'call' ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-(--amp) [transform:scale(calc(1+var(--amp)*0.14))] motion-reduce:[transform:none]"
        >
          {WAVES.map((wave) => (
            <span
              key={wave.id}
              className="absolute -inset-[8%] animate-[fnWave_2600ms_var(--ease-arc)_infinite] rounded-[50%] shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--text-eyebrow)_50%,transparent)]"
              style={{ animationDelay: `${String(wave.delay)}ms` }}
            />
          ))}
        </span>
      ) : null}

      {/* Scaled straight off the amplitude rather than by a keyframe, so the
          sphere swells on the actual syllable. */}
      <span className="absolute inset-0 block rounded-[50%] [transform:scale(calc(1+var(--amp)*0.075))] motion-reduce:[transform:none]">
        <span aria-hidden="true" className={`absolute -inset-[16%] rounded-[50%] ${HALO}`} />
        <span aria-hidden="true" className={`absolute inset-0 overflow-hidden rounded-[50%] ${SPHERE}`}>
          <canvas ref={canvasRef} width={144} height={144} className="absolute -top-[4%] -left-[4%] size-[108%] blur-[7px]" />
          <span className={`absolute inset-0 rounded-[50%] ${SHEEN}`} />
        </span>
        <span
          className={[
            'absolute inset-0 grid place-items-center text-text-on-accent transition-opacity duration-[320ms] ease-[ease-out]',
            LABEL_SHADOW,
            mode === 'docked' || mode === null ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          <span aria-hidden="true" className="flex flex-col items-center gap-3">
            <Icon name="answered" size={30} />
            <span className="font-display text-[27px] leading-[1.2] font-semibold">Nghe thử</span>
            <span className="text-ui opacity-85">Miễn phí</span>
          </span>
        </span>
      </span>
    </button>
  )
}

/**
 * The orb's one animation loop: the canvas field at ~30fps, and the `--amp`
 * envelope every frame. It stops while the tab is hidden, the envelope rests
 * once she is silent and `--amp` has decayed to 0, and a visitor who asked for
 * less motion gets one still frame and no loop at all — `--amp` then snaps.
 */
function useOrbAnimation(
  orbRef: RefObject<HTMLButtonElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  speaking: boolean,
  getAmplitude: () => number | null,
) {
  const voice = useRef({ speaking, since: 0, getAmplitude })
  const onVoiceChange = useRef<(() => void) | null>(null)

  useEffect(() => {
    voice.current = { speaking, since: performance.now(), getAmplitude }
    onVoiceChange.current?.()
  }, [speaking, getAmplitude])

  useEffect(() => {
    const orb = orbRef.current
    const canvas = canvasRef.current
    if (!orb || !canvas) return
    const field = createOrbField(canvas)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let lastField = -Infinity
    let amp = 0

    const writeAmp = (value: number) => {
      amp = value
      orb.style.setProperty('--amp', value.toFixed(3))
    }

    const frame = (now: number) => {
      raf = 0
      if (field && now - lastField >= FIELD_FRAME_MS) {
        lastField = now
        field.draw(now)
      }
      const { speaking: talking, since, getAmplitude: loudness } = voice.current
      if (talking || amp > 0) {
        const target = talking
          ? (loudness() ??
            SYNTHETIC_MID + SYNTHETIC_SWING * Math.sin(((now - since) / 1000) * SYNTHETIC_HZ * Math.PI * 2))
          : 0
        const next = envelopeStep(amp, target, ORB_ENVELOPE)
        writeAmp(!talking && next < AMP_FLOOR ? 0 : next)
      }
      // With no field to draw, a silent orb has nothing left to do this frame.
      if (field || talking || amp > 0) raf = requestAnimationFrame(frame)
    }

    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const start = () => {
      if (raf || document.hidden) return
      if (reduced.matches) {
        field?.draw(STILL_FRAME_MS)
        writeAmp(voice.current.speaking ? SYNTHETIC_MID : 0)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    const onMotionPreference = () => {
      stop()
      start()
    }

    onVoiceChange.current = start
    document.addEventListener('visibilitychange', onVisibility)
    reduced.addEventListener('change', onMotionPreference)
    start()
    return () => {
      stop()
      onVoiceChange.current = null
      document.removeEventListener('visibilitychange', onVisibility)
      reduced.removeEventListener('change', onMotionPreference)
      orb.style.setProperty('--amp', '0')
    }
  }, [orbRef, canvasRef])
}
