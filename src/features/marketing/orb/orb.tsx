import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Icon } from '@/design-system'
import { createAura } from './aura'
import { FIELD_FRAME_MS, STILL_FRAME_MS, createOrbField } from './orb-field'
import {
  ORB_ENVELOPE,
  auraAtRest,
  auraLoudness,
  createAuraState,
  envelopeStep,
  stepAura,
  visualAmplitude,
} from './orb-motion'
import type { OrbMode } from './orb-motion'

/*
 * The orb is one button laid out at its base size (280px) and scaled into place
 * by `use-orb-placement.ts`. Everything inside is sized in % so it stays sharp
 * at every scale. The sphere holds still while she speaks: the one thing on it
 * that answers her voice is a brightness of at most 3%, a calc() off the custom
 * property `--amp`, which the animation loop below writes. Driving it from CSS
 * rather than from React state is what keeps a 60fps envelope from
 * re-rendering the tree.
 *
 * On the call screen her voice shows in the aura behind the sphere (`aura.ts`),
 * which the same loop draws. It fades in once the orb has landed — its fade
 * waits out the flight, `--duration-arc` — and out at once when the orb
 * leaves, so it never sweeps across the hero.
 */

/** Below this, a fading `--amp` is written as 0 and the envelope stops. */
const AMP_FLOOR = 0.001

/*
 * The sphere's ground under the animated field: clay → milk. The field covers
 * it almost entirely; it shows at the blurred rim and before the first frame.
 * Three of its stops have no alias and are mixed from their neighbours.
 */
const SPHERE =
  'bg-[linear-gradient(180deg,var(--text-accent)_0%,var(--text-eyebrow)_34%,color-mix(in_srgb,var(--text-eyebrow)_70%,var(--surface-warm))_56%,color-mix(in_srgb,var(--surface-warm)_82%,var(--text-eyebrow))_76%,color-mix(in_srgb,var(--text-on-accent)_65%,var(--surface-warm))_92%,var(--text-on-accent)_100%)] ' +
  'shadow-[0_20px_70px_color-mix(in_srgb,var(--text-eyebrow)_32%,transparent)] ' +
  '[filter:brightness(calc(1+var(--amp)*0.03))]'
/* Ambient light bleeding past the sphere's edge. */
const HALO =
  'bg-[radial-gradient(circle,color-mix(in_srgb,var(--text-eyebrow)_30%,transparent)_0%,transparent_70%)] blur-[10px]'
/* Frosted-glass sheen near the top. */
const SHEEN =
  'bg-[radial-gradient(circle_at_50%_32%,color-mix(in_srgb,var(--text-on-accent)_12%,transparent)_0%,transparent_55%)]'
const LABEL_SHADOW =
  '[text-shadow:0_1px_3px_color-mix(in_srgb,var(--text-accent)_55%,transparent),0_2px_18px_color-mix(in_srgb,var(--text-accent)_60%,transparent)]'

interface OrbProps {
  orbRef: RefObject<HTMLButtonElement | null>
  /** Null until placed: invisible and not yet pressable. */
  mode: OrbMode | null
  /** True whenever she is talking; drives the envelopes. */
  speaking: boolean
  getAmplitude: () => number | null
  onClick: () => void
}

export function Orb({ orbRef, mode, speaking, getAmplitude, onClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const auraRef = useRef<HTMLCanvasElement>(null)
  const inCall = mode === 'call'
  useOrbAnimation(orbRef, canvasRef, auraRef, inCall, speaking, getAmplitude)

  return (
    <button
      ref={orbRef}
      type="button"
      onClick={onClick}
      aria-label="Nghe thử Fonnus"
      // In the call it sits behind the dialog as its picture; the dialog holds focus.
      tabIndex={inCall ? -1 : undefined}
      className={[
        // `opacity`, `position` and `transform` are the placement's (use-orb-placement.ts).
        'fixed top-0 left-0 size-[280px] origin-top-left rounded-[50%] border-none bg-transparent p-0 opacity-0 will-change-transform [--amp:0]',
        inCall ? 'pointer-events-none z-70' : 'z-30',
        mode === null ? 'pointer-events-none' : 'cursor-pointer',
      ].join(' ')}
    >
      <canvas
        ref={auraRef}
        aria-hidden="true"
        width={160}
        height={160}
        className={[
          'pointer-events-none absolute -top-[70%] -left-[70%] size-[240%] blur-[16px] transition-opacity ease-[ease-out]',
          inCall
            ? 'opacity-100 delay-[var(--duration-arc)] duration-[320ms] motion-reduce:delay-0'
            : 'opacity-0 duration-0',
        ].join(' ')}
      />
      <span className="absolute inset-0 block rounded-[50%]">
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
 * The page's one animation loop for the orb: the canvas field at ~30fps, the
 * `--amp` envelope every frame, and on the call screen the aura every frame.
 * It stops while the tab is hidden.
 *
 * A visitor who asked for less motion gets one still frame of the field, and
 * an aura whose lobes hold their resting places while its opacity still
 * follows her voice: the loop then runs only while she speaks or the aura and
 * `--amp` are still settling, and stops once both are at rest.
 */
function useOrbAnimation(
  orbRef: RefObject<HTMLButtonElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  auraRef: RefObject<HTMLCanvasElement | null>,
  inCall: boolean,
  speaking: boolean,
  getAmplitude: () => number | null,
) {
  const voice = useRef({ inCall, speaking, getAmplitude })
  const onVoiceChange = useRef<(() => void) | null>(null)

  useEffect(() => {
    voice.current = { inCall, speaking, getAmplitude }
    onVoiceChange.current?.()
  }, [inCall, speaking, getAmplitude])

  useEffect(() => {
    const orb = orbRef.current
    const canvas = canvasRef.current
    const auraCanvas = auraRef.current
    if (!orb || !canvas || !auraCanvas) return
    const field = createOrbField(canvas)
    const aura = createAura(auraCanvas)
    const auraState = createAuraState()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let lastField = -Infinity
    let lastFrame = -Infinity
    let amp = 0

    const writeAmp = (value: number) => {
      amp = value
      orb.style.setProperty('--amp', value.toFixed(3))
    }

    const frame = (now: number) => {
      raf = 0
      const still = reduced.matches
      if (field && !still && now - lastField >= FIELD_FRAME_MS) {
        lastField = now
        field.draw(now)
      }
      const dt = now - lastFrame
      lastFrame = now
      const { inCall: auraShown, speaking: talking, getAmplitude: loudness } = voice.current
      const volume = talking ? loudness() : null
      const level = volume === null ? null : auraLoudness(volume)
      if (level !== null || amp > 0) {
        const next = envelopeStep(amp, level ?? 0, dt, ORB_ENVELOPE)
        writeAmp(level === null && next < AMP_FLOOR ? 0 : next)
      }
      // Stepped while hidden too, so an aura shown again starts from where her voice is.
      stepAura(auraState, now, dt, level ?? 0, Math.random(), still)
      const drawsAura = auraShown && aura !== null
      if (drawsAura) aura.draw(now, visualAmplitude(auraState.envelope), auraState, still)
      // Moving: the field always, and the aura's slow drift while it shows.
      // Still: only what her voice has not finished settling.
      const keepGoing = still
        ? talking || amp > 0 || (drawsAura && !auraAtRest(auraState, now))
        : field !== null || drawsAura || talking || amp > 0
      if (keepGoing) raf = requestAnimationFrame(frame)
    }

    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const start = () => {
      if (raf || document.hidden) return
      if (reduced.matches) field?.draw(STILL_FRAME_MS)
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
  }, [orbRef, canvasRef, auraRef])
}
