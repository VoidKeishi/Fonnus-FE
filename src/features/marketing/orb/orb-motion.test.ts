import { describe, expect, it } from 'vitest'
import {
  FIELD_AT_REST,
  FIELD_ENVELOPE,
  ORB_ENVELOPE,
  RIPPLE_LIFE_MS,
  edgeWeight,
  envelopeStep,
  fieldEdge,
  fieldSpread,
  movesByFlight,
  orbPose,
  rippleOffset,
  rippleStrength,
  startsRipple,
  stepField,
  swellOffset,
} from './orb-motion'
import type { FieldState } from './orb-motion'

/*
 * The orb has to land exactly on the hero's dock, leave for the corner at the
 * same line every time, and swell with a real voice, and the dotted field
 * behind it has to breathe with that voice without ever snapping or ringing.
 * All of that is arithmetic the DOM code only feeds; a mistake here shows up
 * as an orb that drifts off the dock, or a field that jitters or never moves.
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
  it('opens the orb fast on a syllable', () => {
    expect(envelopeStep(0, 1, FRAME_60HZ, ORB_ENVELOPE)).toBeCloseTo(0.45, 2)
  })

  it('lets the orb settle slowly through a pause', () => {
    expect(envelopeStep(1, 0, FRAME_60HZ, ORB_ENVELOPE)).toBeCloseTo(0.9, 2)
  })

  it('moves as far in two 120Hz frames as in one 60Hz frame', () => {
    const twice = envelopeStep(envelopeStep(0, 1, FRAME_60HZ / 2, ORB_ENVELOPE), 1, FRAME_60HZ / 2, ORB_ENVELOPE)
    expect(twice).toBeCloseTo(envelopeStep(0, 1, FRAME_60HZ, ORB_ENVELOPE), 10)
  })

  it('counts the first frame after a pause as two frames, not the whole pause', () => {
    expect(envelopeStep(0, 1, 5000, FIELD_ENVELOPE)).toBeCloseTo(envelopeStep(0, 1, 34, FIELD_ENVELOPE), 10)
  })

  it('takes the field about a quarter of a second to answer her voice, and longer to let go', () => {
    let rising = 0
    let falling = 1
    for (let ms = 0; ms < 260; ms += 10) {
      rising = envelopeStep(rising, 1, 10, FIELD_ENVELOPE)
      falling = envelopeStep(falling, 0, 10, FIELD_ENVELOPE)
    }
    expect(rising).toBeCloseTo(1 - Math.exp(-1), 2)
    expect(falling).toBeGreaterThan(0.7)
  })
})

describe('the dotted field', () => {
  it('rests at its smallest, close around the orb, and opens to three radii when she is loud', () => {
    expect(fieldEdge(fieldSpread(0))).toBeCloseTo(1.7)
    expect(fieldEdge(fieldSpread(0.6))).toBeCloseTo(3)
    expect(fieldEdge(fieldSpread(1))).toBeCloseTo(3)
  })

  it('opens more for quiet speech than a straight line would', () => {
    expect(fieldSpread(0.15)).toBeGreaterThan(0.25)
  })

  it('fades out towards its edge as the static pattern’s mask did', () => {
    expect(edgeWeight(0)).toBe(1)
    expect(edgeWeight(16 / 38)).toBeCloseTo(0.55)
    expect(edgeWeight(1)).toBe(0)
    expect(edgeWeight(1.4)).toBe(0)
  })

  it('pushes nothing while she is silent, and least far from the orb', () => {
    expect(swellOffset(1, 0)).toBe(0)
    expect(swellOffset(1, 1)).toBeGreaterThan(swellOffset(2.5, 1))
  })
})

describe('startsRipple', () => {
  it('starts on a syllable that rises well above the field’s envelope', () => {
    expect(startsRipple(0.5, 0.2, 1000)).toBe(true)
  })

  it('ignores steady speech, however loud', () => {
    expect(startsRipple(0.5, 0.45, 1000)).toBe(false)
  })

  it('ignores the ordinary syllables of steady speech, and answers only a strong one', () => {
    expect(startsRipple(0.4, 0.25, 1000)).toBe(false)
    expect(startsRipple(0.55, 0.25, 1000)).toBe(true)
  })

  it('ignores a rise that is still too quiet to hear', () => {
    expect(startsRipple(0.15, 0, 1000)).toBe(false)
  })

  it('waits a moment after the last ripple, so a run of syllables never reads as a beat', () => {
    expect(startsRipple(0.5, 0.2, 200)).toBe(false)
  })
})

describe('rippleOffset', () => {
  const ripple = { bornAt: 0, strength: 1, phase: 0 }

  it('pushes the dots at its front and leaves the ones far from it alone', () => {
    const atFront = rippleOffset(1.8, 0, 500, ripple)
    expect(atFront).toBeGreaterThan(0)
    expect(rippleOffset(3, 0, 500, ripple)).toBeLessThan(atFront / 100)
  })

  it('travels outward', () => {
    const near = (ageMs: number) => rippleOffset(1.4, 0, ageMs, ripple)
    const far = (ageMs: number) => rippleOffset(2.4, 0, ageMs, ripple)
    expect(near(250)).toBeGreaterThan(far(250))
    expect(far(900)).toBeGreaterThan(near(900))
  })

  it('swells in rather than appearing at full strength', () => {
    expect(rippleOffset(1, 0, 1, ripple)).toBeLessThan(rippleOffset(1.2, 0, 120, ripple))
  })

  it('is gone by the end of its life', () => {
    expect(rippleOffset(3.1, 0, RIPPLE_LIFE_MS, ripple)).toBe(0)
  })

  it('reaches a different distance at different angles, so its front is never a circle', () => {
    expect(rippleOffset(1.8, 0, 500, ripple)).not.toBeCloseTo(rippleOffset(1.8, Math.PI / 3, 500, ripple), 4)
  })
})

describe('rippleStrength', () => {
  it('keeps even a faint peak visible and caps a sharp one', () => {
    expect(rippleStrength(0.22, 0.2)).toBe(0.4)
    expect(rippleStrength(0.9, 0)).toBe(1)
  })
})

describe('stepField', () => {
  /** Runs the field at 60fps through `levels`, one loudness per frame, from `state`. */
  function run(levels: readonly number[], from: FieldState = FIELD_AT_REST, start = 0) {
    let state: FieldState | null = from
    const frames: FieldState[] = []
    for (const [i, level] of levels.entries()) {
      state = stepField(state, start + i * FRAME_60HZ, FRAME_60HZ, level, 0)
      if (!state) break
      frames.push(state)
    }
    return { frames, last: state }
  }

  it('does nothing at all while she has not spoken', () => {
    expect(stepField(FIELD_AT_REST, 1000, FRAME_60HZ, 0, 0)).toBeNull()
  })

  it('opens gradually rather than jumping to her level', () => {
    const { frames } = run([0.5, 0.5, 0.5])
    expect(frames[0]?.envelope).toBeLessThan(0.05)
    expect(frames[2]?.envelope).toBeGreaterThan(frames[0]?.envelope ?? 1)
  })

  it('decays to rest after she stops, draws that rest once, and then lets the loop stop', () => {
    const speech = run(Array<number>(60).fill(0.5))
    const silence = Array<number>(600).fill(0)
    const after = run(silence, speech.last ?? FIELD_AT_REST, 60 * FRAME_60HZ)
    const rest = after.frames.at(-1)
    expect(rest?.envelope).toBe(0)
    expect(rest?.ripples).toHaveLength(0)
    // The loop stopped before the silence ran out.
    expect(after.frames.length).toBeLessThan(silence.length)
    expect(after.last).toBeNull()
  })

  it('never has more than three ripples alive, however many peaks she makes', () => {
    // A sharp peak every 26 frames (433ms, just past the gap), with silence between.
    const levels = Array.from({ length: 600 }, (_, i) => (i % 26 === 0 ? 0.9 : 0))
    const { frames } = run(levels)
    expect(Math.max(...frames.map((frame) => frame.ripples.length))).toBe(3)
  })

  it('lets each ripple go at the end of its life', () => {
    const { frames } = run([0.9, ...Array<number>(Math.ceil(RIPPLE_LIFE_MS / FRAME_60HZ) + 1).fill(0)])
    expect(frames[0]?.ripples).toHaveLength(1)
    expect(frames.at(-1)?.ripples).toHaveLength(0)
  })
})
