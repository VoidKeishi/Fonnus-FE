/**
 * The orb's arithmetic, kept free of the DOM so it can be checked on its own:
 * where it sits in each pose, whether a move is a flight or a jump, and how the
 * voice's loudness becomes the `--amp` its waves ride on.
 */

/** The orb is laid out at this size and scaled into every pose. */
export const ORB_BASE = 280
export const PINNED_SIZE = 84
const PINNED_RIGHT = 24
const PINNED_BOTTOM = 28
/** Once the dock's bottom edge is above this line the orb leaves for the corner. */
export const PIN_AT = 120
/** Length of a flight between poses; `--duration-arc` in motion.css. */
export const FLIGHT_MS = 520

/**
 * docked — on the hero's dock, at the dock's size
 * pinned — 84px in the bottom-right corner, once the hero has scrolled away
 * call   — in the call screen's centre slot
 */
export type OrbMode = 'docked' | 'pinned' | 'call'

export interface OrbPose {
  mode: OrbMode
  /** Viewport coordinates of the orb's top-left corner. */
  x: number
  y: number
  scale: number
}

/** The part of a `DOMRect` a pose reads. */
export interface Box {
  left: number
  top: number
  width: number
  bottom: number
}

export interface PoseInput {
  dock: Box
  viewport: { width: number; height: number }
  call: boolean
  /** The call screen's slot, or null before it has mounted. */
  spot: Box | null
}

/** Where the orb rests while no call is open. */
export function restingMode(dock: Box): 'docked' | 'pinned' {
  return dock.bottom < PIN_AT ? 'pinned' : 'docked'
}

export function orbPose({ dock, viewport, call, spot }: PoseInput): OrbPose {
  if (call) {
    if (spot) return { mode: 'call', x: spot.left, y: spot.top, scale: spot.width / ORB_BASE }
    // No slot to measure: centre it where the slot would be.
    const size = Math.min(320, Math.max(200, viewport.height * 0.32))
    return {
      mode: 'call',
      x: (viewport.width - size) / 2,
      y: viewport.height * 0.44 - size / 2,
      scale: size / ORB_BASE,
    }
  }
  if (restingMode(dock) === 'pinned') {
    return {
      mode: 'pinned',
      x: viewport.width - PINNED_SIZE - PINNED_RIGHT,
      y: viewport.height - PINNED_SIZE - PINNED_BOTTOM,
      scale: PINNED_SIZE / ORB_BASE,
    }
  }
  return { mode: 'docked', x: dock.left, y: dock.top, scale: dock.width / ORB_BASE }
}

/**
 * Only the very first placement is instant; every change of pose after it is a
 * flight. A re-measure that keeps the pose flies too, except on the dock: there
 * it follows the dock at once, unless a flight home is still in the air, which
 * it re-targets instead of cutting short.
 */
export function movesByFlight(prev: OrbMode | null, next: OrbMode, inFlight: boolean): boolean {
  if (prev === null) return false
  if (prev !== next) return true
  return next !== 'docked' || inFlight
}

export interface Envelope {
  /** Share of the gap closed per frame while rising. */
  attack: number
  /** Share of the gap closed per frame while falling. */
  release: number
}

/** The orb's own smoothing: waves snap open on a syllable and settle through a pause. */
export const ORB_ENVELOPE: Envelope = { attack: 0.45, release: 0.1 }
/** The greeting's loudness is smoothed once more before the orb sees it. */
export const GREETING_ENVELOPE: Envelope = { attack: 0.5, release: 0.12 }

export function envelopeStep(value: number, target: number, { attack, release }: Envelope): number {
  return value + (target - value) * (target > value ? attack : release)
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
