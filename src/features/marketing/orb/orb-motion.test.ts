import { describe, expect, it } from 'vitest'
import { ORB_ENVELOPE, envelopeStep, movesByFlight, orbPose, speechLevel } from './orb-motion'

/*
 * The orb has to land exactly on the hero's dock, leave for the corner at the
 * same line every time, and let its waves follow a real voice. All of that is
 * arithmetic the DOM code only feeds; a mistake here shows up as an orb that
 * drifts off the dock or waves that never move.
 */

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
  it('opens fast on a syllable', () => {
    expect(envelopeStep(0, 1, ORB_ENVELOPE)).toBeCloseTo(0.45)
  })

  it('settles slowly through a pause', () => {
    expect(envelopeStep(1, 0, ORB_ENVELOPE)).toBeCloseTo(0.9)
  })
})

describe('speechLevel', () => {
  it('is silent for a flat signal', () => {
    expect(speechLevel(new Uint8Array(512).fill(128))).toBe(0)
  })

  it('scales quiet speech up by 3.2', () => {
    // ±16 around the centre is an RMS of 0.125.
    const quiet = Uint8Array.from({ length: 512 }, (_, i) => (i % 2 ? 144 : 112))
    expect(speechLevel(quiet)).toBeCloseTo(0.4)
  })

  it('never passes 1 however loud the voice', () => {
    const loud = Uint8Array.from({ length: 512 }, (_, i) => (i % 2 ? 255 : 0))
    expect(speechLevel(loud)).toBe(1)
  })

  it('is silent for an empty frame', () => {
    expect(speechLevel(new Uint8Array(0))).toBe(0)
  })
})
