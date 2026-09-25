import { describe, expect, it } from 'vitest'
import { LUT_SIZE, buildRampLut } from './orb-field'
import type { RampStop } from './orb-field'

/*
 * The orb's colour comes entirely from this ramp. An off-by-one at either end
 * paints the deepest clay or the milk highlight wrong on every frame, and a
 * straight blend between stops shows as bands across the sphere.
 */

const CLAY_TO_MILK: RampStop[] = [
  [0, 138, 65, 24],
  [0.3, 184, 92, 43],
  [1, 255, 251, 242],
]

function colourAt(lut: Uint8ClampedArray, index: number): number[] {
  return Array.from(lut.slice(index * 3, index * 3 + 3))
}

describe('buildRampLut', () => {
  it('holds 512 packed RGB entries', () => {
    expect(buildRampLut(CLAY_TO_MILK)).toHaveLength(LUT_SIZE * 3)
  })

  it('starts on the first stop and ends on the last', () => {
    const lut = buildRampLut(CLAY_TO_MILK)
    expect(colourAt(lut, 0)).toEqual([138, 65, 24])
    expect(colourAt(lut, LUT_SIZE - 1)).toEqual([255, 251, 242])
  })

  it('eases between stops with smoothstep rather than a straight blend', () => {
    const lut = buildRampLut([
      [0, 0, 0, 0],
      [1, 255, 255, 255],
    ])
    const i = 128
    const t = i / (LUT_SIZE - 1)
    const smooth = 255 * t * t * (3 - 2 * t)
    expect(lut[i * 3]).toBeCloseTo(smooth, 0)
    // A quarter of the way in, smoothstep is still well below the straight line.
    expect(lut[i * 3]).toBeLessThan(255 * t - 10)
  })

  it('holds the first stop’s colour below a ramp that starts part-way in', () => {
    // The three shades between the aliased ends start at 0.52, not at 0.
    const lut = buildRampLut([
      [0.52, 208, 138, 85],
      [0.7, 239, 197, 164],
      [0.84, 248, 227, 223],
    ])
    expect(colourAt(lut, 0)).toEqual([208, 138, 85])
  })

  it('is an all-zero buffer, not a crash, with no stops at all', () => {
    expect(buildRampLut([]).every((channel) => channel === 0)).toBe(true)
  })
})
