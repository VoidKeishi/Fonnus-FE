import { AMBER, CREAM, aliasRgb } from './orb-field'
import type { Rgb } from './orb-field'
import { AURA_HAZE, AURA_LOBES, AURA_NEAR, AURA_REACH, lobeBulge, placeBlob } from './orb-motion'
import type { AuraBlob, AuraState, AuraTone, BlobPlacement } from './orb-motion'

/**
 * The aura: her voice on the call screen, a soft light behind the sphere.
 *
 * Three layers of soft radial gradients — a faint haze about 2.1 orb diameters
 * across, seven asymmetric lobes, and a near glow just past the sphere's rim —
 * placed by `orb-motion.ts`, never a ring and never one shape turned as a
 * whole. The canvas is small (160×160, 2.4 orb diameters across) and blurred
 * by CSS, like the orb's own field. It belongs to the call screen, sized off
 * the orb's slot there, so it paints under the screen's text.
 *
 * This module only draws; `orb.tsx` owns the one animation loop that calls it.
 */

/** A blob's gradient, by layer: where its colour sits, as a share of its radius, and how much of its opacity. */
type Profile = readonly (readonly [at: number, share: number])[]
const NEAR_PROFILE: Profile = [
  [0, 1],
  [0.7, 0.85],
  [1, 0],
]
const LOBE_PROFILE: Profile = [
  [0, 1],
  [0.55, 0.52],
  [1, 0],
]
const HAZE_PROFILE: Profile = [
  [0, 1],
  [0.45, 0.55],
  [1, 0],
]

/** A blob ready to draw: its stops built once, as colour strings at its full opacity. */
interface Painted {
  blob: AuraBlob
  stops: readonly (readonly [at: number, color: string])[]
}

export interface Aura {
  /** One frame: `visual` is the voice as the aura shows it, `still` a visitor who asked for less motion. */
  draw: (ms: number, visual: number, state: AuraState, still: boolean) => void
}

/** Null when the browser gives no 2D context; the call screen then shows the orb without an aura. */
export function createAura(canvas: HTMLCanvasElement): Aura | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const clay = aliasRgb(ctx, '--text-eyebrow') ?? AMBER
  const palette: Record<AuraTone, Rgb> = {
    deep: aliasRgb(ctx, '--text-accent') ?? clay,
    clay,
    amber: AMBER,
    cream: CREAM,
  }
  const paint = (blobs: readonly AuraBlob[], profile: Profile): Painted[] =>
    blobs.map((blob) => ({
      blob,
      stops: profile.map(([at, share], i) => {
        const [r, g, b] = palette[i === 0 ? blob.tones[0] : blob.tones[1]]
        return [at, `rgba(${String(r)},${String(g)},${String(b)},${String(share)})`] as const
      }),
    }))
  // Back to front: the haze, the lobes, the glow at the rim.
  const haze = paint(AURA_HAZE, HAZE_PROFILE)
  const lobes = paint(AURA_LOBES, LOBE_PROFILE)
  const near = paint(AURA_NEAR, NEAR_PROFILE)

  const size = canvas.width
  const centre = size / 2
  const unit = size / (2 * AURA_REACH)
  const place: BlobPlacement = { x: 0, y: 0, radius: 0, alpha: 0 }

  const fill = ({ stops }: Painted) => {
    const x = centre + place.x * unit
    const y = centre + place.y * unit
    const r = place.radius * unit
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    for (const [at, color] of stops) gradient.addColorStop(at, color)
    ctx.globalAlpha = place.alpha
    ctx.fillStyle = gradient
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  const draw = (ms: number, visual: number, state: AuraState, still: boolean) => {
    ctx.clearRect(0, 0, size, size)
    for (const painted of haze) {
      placeBlob(place, painted.blob, ms, visual, 0, still)
      fill(painted)
    }
    for (const [i, painted] of lobes.entries()) {
      placeBlob(place, painted.blob, ms, visual, lobeBulge(state, i, ms), still)
      fill(painted)
    }
    for (const painted of near) {
      placeBlob(place, painted.blob, ms, visual, 0, still)
      fill(painted)
    }
    ctx.globalAlpha = 1
  }

  return { draw }
}
