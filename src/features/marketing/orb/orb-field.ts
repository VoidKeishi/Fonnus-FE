/**
 * The orb's living gradient.
 *
 * Not a gradient whose position is animated — a deforming scalar field. Each
 * pixel's colour comes from a domain-warped sum of five soft lobes plus three
 * sine terms, sampled through a clay → cream colour ramp. Because every
 * temporal frequency is an integer multiple of TAU/T, the whole field closes
 * seamlessly after T seconds: no reset, no reversal, no visible loop point.
 *
 * The canvas is deliberately tiny (144×144) and blurred by CSS, which is what
 * makes the result read as pigment under frosted glass rather than as pixels.
 * This module only draws; `orb.tsx` owns the one animation loop that calls it.
 */
const PERIOD_SECONDS = 44
/** ~30fps: the field drifts too slowly for more to show. */
export const FIELD_FRAME_MS = 33
/** The frame drawn once, and left, for a visitor who asked for less motion. */
export const STILL_FRAME_MS = 9000

/** A ramp stop: position 0–1, then red, green, blue. */
export type RampStop = readonly [at: number, r: number, g: number, b: number]

export const LUT_SIZE = 512

/**
 * The colour ramp, sampled 512 times into packed RGB. Smoothstep between stops,
 * so stop boundaries never band.
 */
export function buildRampLut(stops: readonly RampStop[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(LUT_SIZE * 3)
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first || !last) return lut
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1)
    let a = first
    let b = last
    for (let s = 0; s < stops.length - 1; s++) {
      const lo = stops[s]
      const hi = stops[s + 1]
      if (lo && hi && t >= lo[0] && t <= hi[0]) {
        a = lo
        b = hi
        break
      }
    }
    const f = Math.min(1, Math.max(0, (t - a[0]) / Math.max(1e-6, b[0] - a[0])))
    const g = f * f * (3 - 2 * f)
    lut[i * 3] = a[1] + (b[1] - a[1]) * g
    lut[i * 3 + 1] = a[2] + (b[2] - a[2]) * g
    lut[i * 3 + 2] = a[3] + (b[3] - a[3]) * g
  }
  return lut
}

/*
 * Deep brown → clay → cream → blush → milk. The three ends that have an alias
 * are read from it at runtime (`resolveStops`). The three between them are the
 * one declared exception to "no literal colour": a canvas pixel buffer takes
 * numbers, not `var()`, and no alias carries these shades. (248,227,223 equals
 * `--surface-rose`, but that alias means an error tint, so it is not borrowed.)
 */
const ALIAS_STOPS: readonly (readonly [at: number, alias: string])[] = [
  [0, '--text-accent'],
  [0.3, '--text-eyebrow'],
  [1, '--surface-card'],
]
const LITERAL_STOPS: readonly RampStop[] = [
  [0.52, 208, 138, 85],
  [0.7, 239, 197, 164],
  [0.84, 248, 227, 223],
]

/**
 * Reads a CSS colour back as RGB. Assigning to `fillStyle` makes the browser do
 * the parsing; it reads back as `#rrggbb` for any opaque colour. An invalid
 * value is ignored, leaving `transparent`, which reads back as `rgba(…)` and is
 * rejected.
 */
function rgbOf(ctx: CanvasRenderingContext2D, color: string): [number, number, number] | null {
  if (!color) return null
  ctx.fillStyle = 'transparent'
  ctx.fillStyle = color
  const parsed = ctx.fillStyle
  const hex = typeof parsed === 'string' ? /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(parsed) : null
  if (!hex?.[1] || !hex[2] || !hex[3]) return null
  return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)]
}

function resolveStops(ctx: CanvasRenderingContext2D): RampStop[] {
  const root = getComputedStyle(document.documentElement)
  const fromAliases = ALIAS_STOPS.flatMap(([at, alias]): RampStop[] => {
    const rgb = rgbOf(ctx, root.getPropertyValue(alias).trim())
    return rgb ? [[at, ...rgb]] : []
  })
  return [...fromAliases, ...LITERAL_STOPS].toSorted((a, b) => a[0] - b[0])
}

/* Built on the first draw, not at import: it needs the document's tokens. */
let lut: Uint8ClampedArray | null = null

export interface OrbField {
  draw: (ms: number) => void
}

/** Null when the browser gives no 2D context; the sphere's own gradient then shows. */
export function createOrbField(canvas: HTMLCanvasElement): OrbField | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  lut ??= buildRampLut(resolveStops(ctx))
  const ramp = lut

  const W = canvas.width
  const H = canvas.height
  const img = ctx.createImageData(W, H)
  const px = img.data
  const TAU = Math.PI * 2
  const { sin, cos, abs } = Math

  const draw = (ms: number) => {
    const th = (((ms / 1000) % PERIOD_SECONDS) / PERIOD_SECONDS) * TAU
    // Five lobes, each orbiting on its own pair of harmonics — they drift,
    // merge and dissolve instead of circling as recognisable blobs.
    const lobes: [number, number, number, number][] = [
      [0.62 * cos(th + 0.4), 0.62 * sin(2 * th + 1.1), 1.05, 1.05],
      [0.66 * cos(2 * th + 2.6), 0.66 * sin(th + 4.2), 0.95, 0.8],
      [0.58 * cos(th + 3.6), 0.58 * sin(3 * th + 0.7), 0.9, -1.15],
      [0.5 * cos(3 * th + 5.1), 0.5 * sin(2 * th + 2.9), 0.85, -0.8],
      [0.72 * cos(2 * th + 5.8), 0.72 * sin(3 * th + 3.3), 0.9, 0.7],
    ]
    const pA = 2 * cos(th + 0.9)
    const pB = 2 * cos(2 * th + 3.7)
    const pC = 2 * sin(th + 5.2)
    const pD = 2 * sin(2 * th + 1.6)
    const pE = 1.5 * cos(3 * th + 0.3)

    let o = 0
    for (let j = 0; j < H; j++) {
      const y = (j / (H - 1)) * 2 - 1
      for (let i = 0; i < W; i++, o += 4) {
        const x = (i / (W - 1)) * 2 - 1
        if (x * x + y * y > 1.15) {
          px[o + 3] = 0
          continue
        }
        // Domain warp: sample the field at a bent coordinate, so the whole
        // composition stretches and curls rather than sliding.
        const u = x + 0.45 * sin(1.9 * y + pA) + 0.3 * sin(2.8 * x + 1.7 * y + pB)
        const v = y + 0.45 * sin(2.2 * x + pC) + 0.3 * sin(2.4 * y - 1.6 * x + pD)
        let f = 0.5 * sin(1.5 * u + 1.2 * v + pB) + 0.4 * sin(1.9 * v - 1.4 * u + pC) + 0.25 * sin(3.1 * u * v + pE)
        for (const [lx, ly, spread, weight] of lobes) {
          const dx = u - lx
          const dy = v - ly
          const d = 1 - (dx * dx + dy * dy) * spread
          if (d > 0) f += weight * d * d
        }
        const n = f / (1 + abs(f)) // soft-clamp to (-1, 1): no hard edges
        const idx = ((0.5 + 0.5 * n) * (LUT_SIZE - 1)) | 0
        px[o] = ramp[idx * 3] ?? 0
        px[o + 1] = ramp[idx * 3 + 1] ?? 0
        px[o + 2] = ramp[idx * 3 + 2] ?? 0
        px[o + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }

  return { draw }
}
