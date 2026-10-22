import { describe, expect, it } from 'vitest'
import {
  AURA_ENVELOPE,
  AURA_HAZE,
  AURA_LOBES,
  AURA_MAX,
  AURA_NEAR,
  AURA_REACH,
  BULGE_MS,
  ORB_ENVELOPE,
  auraLoudness,
  createAuraState,
  envelopeStep,
  isPeak,
  lobeBulge,
  movesByFlight,
  orbPose,
  placeBlob,
  stepAura,
  visualAmplitude,
} from './orb-motion'
import type { AuraState, BlobPlacement } from './orb-motion'

/*
 * The orb has to land exactly on the hero's dock, leave for the corner at the
 * same line every time, and on the call screen answer her voice with an aura
 * that swells unevenly, never rings and never pulses all round. All of that is
 * arithmetic the DOM code only feeds; a mistake here shows up as an orb that
 * drifts off the dock, or an aura that flickers, mirrors itself or blooms
 * past its canvas.
 */

const FRAME_60HZ = 1000 / 60

const DESKTOP = { width: 1440, height: 900 }
const dockAt = (top: number, size = 344) => ({ left: 900, top, width: size, bottom: top + size })

describe('orbPose', () => {
  it('sits on the dock at the dock’s size', () => {
    expect(orbPose({ dock: dockAt(200), viewport: DESKTOP, call: false, spot: null })).toEqual({
      mode: 'docked',
      x: 900,
      y: 200,
      scale: 344 / 280,
    })
  })

  it('stays docked while the dock’s bottom is exactly on the 120px line', () => {
    expect(orbPose({ dock: dockAt(120 - 344), viewport: DESKTOP, call: false, spot: null }).mode).toBe('docked')
  })

  it('pins to the corner, 84px, 24px from the right and 28px from the bottom, once past the line', () => {
    expect(orbPose({ dock: dockAt(119 - 344), viewport: DESKTOP, call: false, spot: null })).toEqual({
      mode: 'pinned',
      x: 1440 - 84 - 24,
      y: 900 - 84 - 28,
      scale: 84 / 280,
    })
  })

  it('flies into the call screen’s slot, wherever the page is', () => {
    const spot = { left: 560, top: 250, width: 288, bottom: 538 }
    expect(orbPose({ dock: dockAt(-2000), viewport: DESKTOP, call: true, spot })).toEqual({
      mode: 'call',
      x: 560,
      y: 250,
      scale: 288 / 280,
    })
  })

  it('centres itself where the slot would be before the slot has mounted', () => {
    // 32% of 900 is 288, inside the 200–320 clamp.
    expect(orbPose({ dock: dockAt(200), viewport: DESKTOP, call: true, spot: null })).toEqual({
      mode: 'call',
      x: (1440 - 288) / 2,
      y: 900 * 0.44 - 288 / 2,
      scale: 288 / 280,
    })
  })
})

describe('movesByFlight', () => {
  it('places the orb instantly the first time', () => {
    expect(movesByFlight(null, 'docked', false)).toBe(false)
  })

  it('flies on every change of pose', () => {
    expect(movesByFlight('docked', 'pinned', false)).toBe(true)
    expect(movesByFlight('pinned', 'call', false)).toBe(true)
  })

  it('follows the dock at once when it moves, unless a flight home is still in the air', () => {
    expect(movesByFlight('docked', 'docked', false)).toBe(false)
    expect(movesByFlight('docked', 'docked', true)).toBe(true)
  })

  it('flies to the corner’s new place when it is re-measured while pinned', () => {
    expect(movesByFlight('pinned', 'pinned', false)).toBe(true)
  })
})

describe('envelopeStep', () => {
  it('brightens the sphere fast on a syllable', () => {
    expect(envelopeStep(0, 1, FRAME_60HZ, ORB_ENVELOPE)).toBeCloseTo(0.45, 2)
  })

  it('lets the sphere settle slowly through a pause', () => {
    expect(envelopeStep(1, 0, FRAME_60HZ, ORB_ENVELOPE)).toBeCloseTo(0.9, 2)
  })

  it('moves as far in two 120Hz frames as in one 60Hz frame', () => {
    const twice = envelopeStep(envelopeStep(0, 1, FRAME_60HZ / 2, ORB_ENVELOPE), 1, FRAME_60HZ / 2, ORB_ENVELOPE)
    expect(twice).toBeCloseTo(envelopeStep(0, 1, FRAME_60HZ, ORB_ENVELOPE), 10)
  })

  it('counts the first frame after a pause as two frames, not the whole pause', () => {
    expect(envelopeStep(0, 1, 5000, AURA_ENVELOPE)).toBeCloseTo(envelopeStep(0, 1, 34, AURA_ENVELOPE), 10)
  })

  it('opens the aura faster than it lets it go', () => {
    let rising = 0
    let falling = 1
    for (let ms = 0; ms < 200; ms += 10) {
      rising = envelopeStep(rising, 1, 10, AURA_ENVELOPE)
      falling = envelopeStep(falling, 0, 10, AURA_ENVELOPE)
    }
    // How far each has travelled in the same 200ms.
    expect(rising).toBeGreaterThan(1 - falling)
  })
})

describe('the aura’s amplitude', () => {
  it('never shows more than its maximum, however loud she is', () => {
    expect(visualAmplitude(auraLoudness(1))).toBeLessThanOrEqual(AURA_MAX)
    expect(visualAmplitude(5)).toBe(AURA_MAX)
  })

  it('reads the line noise under her voice as silence', () => {
    expect(auraLoudness(0)).toBe(0)
    expect(visualAmplitude(auraLoudness(0.01))).toBe(0)
  })
})

describe('the aura’s lobes at rest', () => {
  const centres = AURA_LOBES.map((lobe) => {
    const out: BlobPlacement = { x: 0, y: 0, radius: 0, alpha: 0 }
    placeBlob(out, lobe, 0, 0, 0, false)
    return out
  })

  it('sit in different places, not stacked on one point', () => {
    for (const [i, a] of centres.entries()) {
      for (const b of centres.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.05)
    }
  })

  it('have no pair mirrored through the orb’s centre, so the aura is never symmetric', () => {
    for (const [i, a] of centres.entries()) {
      for (const [j, b] of centres.entries()) {
        if (i !== j) expect(Math.hypot(a.x + b.x, a.y + b.y)).toBeGreaterThan(0.05)
      }
    }
  })
})

describe('the aura at its loudest', () => {
  it('stays inside its canvas, so no gradient is ever cut into a hard edge', () => {
    const out: BlobPlacement = { x: 0, y: 0, radius: 0, alpha: 0 }
    const layers = [
      { blobs: AURA_HAZE, bulge: 0 },
      { blobs: AURA_LOBES, bulge: 1 },
      { blobs: AURA_NEAR, bulge: 0 },
    ]
    for (const { blobs, bulge } of layers) {
      for (const blob of blobs) {
        for (let ms = 0; ms < 30000; ms += 250) {
          placeBlob(out, blob, ms, AURA_MAX, bulge, false)
          expect(Math.hypot(out.x, out.y) + out.radius).toBeLessThanOrEqual(AURA_REACH)
          expect(out.alpha).toBeLessThanOrEqual(0.3)
        }
      }
    }
  })
})

describe('a peak in her voice', () => {
  /** Runs the aura at 60fps through `levels`, one loudness per frame, every peak landing at `pick`. */
  function run(levels: readonly number[], pick: number, state: AuraState = createAuraState(), start = 0) {
    for (const [i, level] of levels.entries()) stepAura(state, start + i * FRAME_60HZ, FRAME_60HZ, level, pick, false)
    return state
  }
  const bulging = (state: AuraState, now: number) =>
    AURA_LOBES.filter((_, i) => lobeBulge(state, i, now) > 0).length

  it('bulges one or two lobes, never all of them', () => {
    for (const pick of [0, 0.13, 0.37, 0.5, 0.71, 0.94]) {
      const state = run([0, 0, 1], pick)
      const after = 2 * FRAME_60HZ + 60
      expect(bulging(state, after)).toBeGreaterThanOrEqual(1)
      expect(bulging(state, after)).toBeLessThanOrEqual(2)
    }
  })

  it('bulges a single lobe for a faint peak', () => {
    const state = run([0, 0, 0.2], 0.3)
    expect(bulging(state, 2 * FRAME_60HZ + 60)).toBe(1)
  })

  it('lets steady speech, a quiet onset and a quick repeat pass without a bulge', () => {
    expect(isPeak(0.6, 0.1, 1000)).toBe(true)
    expect(isPeak(0.5, 0.45, 1000)).toBe(false)
    expect(isPeak(0.15, 0, 1000)).toBe(false)
    expect(isPeak(0.6, 0.1, 200)).toBe(false)
  })

  it('lets the bulge go within half a second', () => {
    const state = run([1], 0.3)
    expect(bulging(state, 200)).toBeGreaterThan(0)
    expect(BULGE_MS).toBeGreaterThanOrEqual(400)
    expect(BULGE_MS).toBeLessThanOrEqual(500)
    expect(bulging(state, BULGE_MS)).toBe(0)
  })

  it('takes no bulge for a visitor who asked for less motion', () => {
    const state = createAuraState()
    stepAura(state, 0, FRAME_60HZ, 1, 0.3, true)
    expect(bulging(state, 100)).toBe(0)
  })
})
