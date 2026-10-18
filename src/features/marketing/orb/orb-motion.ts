/**
 * The orb's arithmetic, kept free of the DOM so it can be checked on its own:
 * where it sits in each pose, whether a move is a flight or a jump, how the
 * voice's loudness becomes the orb's `--amp`, and how it moves the dotted field
 * around the orb on the call screen (`dot-field.ts` draws what this computes).
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
  /** Time constant while rising: after this long, about two thirds of the gap is closed. */
  attackMs: number
  /** Time constant while falling. */
  releaseMs: number
}

/**
 * The orb's own smoothing: the sphere swells on a syllable and settles through
 * a pause. Equal to closing 45% and 10% of the gap per frame at 60fps.
 */
export const ORB_ENVELOPE: Envelope = { attackMs: 28, releaseMs: 160 }

/*
 * The longest step an envelope takes in one frame. The first frame after the
 * loop rests, or after a hidden tab, would otherwise count the whole pause and
 * jump; it counts as two frames at 60fps instead.
 */
const MAX_STEP_MS = 34

/** Measured in time rather than frames, so a 120Hz screen eases at the same pace as a 60Hz one. */
export function envelopeStep(value: number, target: number, dtMs: number, { attackMs, releaseMs }: Envelope): number {
  const tau = target > value ? attackMs : releaseMs
  return value + (target - value) * (1 - Math.exp(-Math.min(dtMs, MAX_STEP_MS) / tau))
}

/*
 * The dotted field. It answers her voice through a slower envelope than the
 * orb's, so it opens and closes like breath rather than on each syllable, and
 * every size is in orb radii, so the field keeps its proportions around a
 * 200px orb on a phone and a 320px one on a desktop.
 */
export const FIELD_ENVELOPE: Envelope = { attackMs: 260, releaseMs: 900 }
/** Below this a fading field is at rest: drawn one last time, then left. */
const FIELD_FLOOR = 0.002
/** The loudness that opens the field fully. ASSUMED from the SDK's 0–1 output volume; tune on a live call. */
const FIELD_LOUD = 0.6
/**
 * Where the field's soft edge sits, silent and loud. Before it moved, the
 * mask ended at about 2.3 radii; silence is now three quarters of that and
 * loud speech 1.3 times it.
 */
const EDGE_REST = 1.7
const EDGE_LOUD = 3
/** How far loud speech pushes the dots at the orb's rim; it falls off as 1/r beyond. */
const SWELL = 0.05

/** How open the field is, 0–1, eased so quiet speech already shows. */
export function fieldSpread(envelope: number): number {
  const level = Math.min(1, Math.max(0, envelope / FIELD_LOUD))
  return 1 - (1 - level) * (1 - level)
}

/** Distance from the orb's centre to the field's edge, in radii. */
export function fieldEdge(spread: number): number {
  return EDGE_REST + (EDGE_LOUD - EDGE_REST) * spread
}

/**
 * How much of a dot shows at `t`, its distance as a share of the edge: the
 * stops of the mask the static pattern had (full, 55% at 16/38, none at the edge).
 */
export function edgeWeight(t: number): number {
  const knee = 16 / 38
  if (t <= 0) return 1
  if (t >= 1) return 0
  return t < knee ? 1 - 0.45 * (t / knee) : 0.55 * (1 - (t - knee) / (1 - knee))
}

/** The outward push of the whole field at a distance `r` (radii), before any ripple. */
export function swellOffset(r: number, spread: number): number {
  return (SWELL * spread) / Math.max(1, r)
}

/*
 * A ripple is a pressure front leaving the orb's rim: each dot it passes is
 * pushed out and let back, so the field compresses and relaxes along it. It
 * moves dots and never brightens them, and its radius wobbles with the angle,
 * so it reads as pressure moving through the dots, never as a ring drawn in them.
 */
export interface Ripple {
  bornAt: number
  /** 0.4–1, from how far the peak rose above the envelope. */
  strength: number
  /** Turns the wobble, so no two fronts share a shape. */
  phase: number
}

export const RIPPLE_LIFE_MS = 1300
const RIPPLE_MAX = 3
/**
 * A peak counts once it rises above the slow envelope by this much plus this
 * share of the envelope: from silence any clear onset does, while she talks
 * steadily only a syllable well above her own level does, so ordinary speech
 * never sets the field beating.
 */
const RIPPLE_RISE = 0.12
const RIPPLE_RISE_SHARE = 0.5
/** …is at least this loud… */
const RIPPLE_FLOOR = 0.2
/** …and comes this long after the last one. */
const RIPPLE_GAP_MS = 420
/** Radii per second. */
const RIPPLE_SPEED = 1.6
/** Half-width of the front, in radii. */
const RIPPLE_WIDTH = 0.35
/** Largest push at the front, in radii: about 4px around a 288px orb. */
const RIPPLE_PUSH = 0.03
/** How far the front's radius strays from a circle. */
const RIPPLE_WOBBLE = 0.12

/** Whether this frame's loudness is a peak worth a ripple. */
export function startsRipple(loudness: number, envelope: number, msSinceLast: number): boolean {
  return (
    loudness >= RIPPLE_FLOOR &&
    loudness - envelope >= RIPPLE_RISE + RIPPLE_RISE_SHARE * envelope &&
    msSinceLast >= RIPPLE_GAP_MS
  )
}

export function rippleStrength(loudness: number, envelope: number): number {
  return Math.min(1, Math.max(0.4, (loudness - envelope) / 0.3))
}

/**
 * The push a ripple gives a dot at distance `r` (radii) and `angle`, `ageMs`
 * after it left the rim. It swells in over its first sixth and dies out
 * before the front is much past the loud edge.
 */
export function rippleOffset(r: number, angle: number, ageMs: number, { strength, phase }: Ripple): number {
  const life = ageMs / RIPPLE_LIFE_MS
  if (life <= 0 || life >= 1) return 0
  const wobble = 1 + RIPPLE_WOBBLE * (0.6 * Math.sin(2 * angle + phase) + 0.4 * Math.sin(3 * angle + 1.7 * phase))
  const front = (1 + (RIPPLE_SPEED * ageMs) / 1000) * wobble
  const x = (r - front) / RIPPLE_WIDTH
  const fade = (1 - life) * (1 - life) * Math.min(1, life * 6)
  return RIPPLE_PUSH * strength * fade * Math.exp(-x * x)
}

export interface FieldState {
  envelope: number
  ripples: readonly Ripple[]
  lastRipple: number
}

export const FIELD_AT_REST: FieldState = { envelope: 0, ripples: [], lastRipple: -Infinity }

/**
 * One frame of the field. `loudness` is 0 when there is no live voice, and
 * `phase` turns a ripple started this frame. Null when the field was already
 * at rest, so there is nothing to draw and the loop may stop for it; the frame
 * that reaches rest is returned once, to be drawn as the resting field.
 */
export function stepField(
  state: FieldState,
  now: number,
  dtMs: number,
  loudness: number,
  phase: number,
): FieldState | null {
  const { envelope, ripples, lastRipple } = state
  if (loudness === 0 && envelope === 0 && ripples.length === 0) return null
  const ripple =
    ripples.length < RIPPLE_MAX && startsRipple(loudness, envelope, now - lastRipple)
      ? { bornAt: now, strength: rippleStrength(loudness, envelope), phase }
      : null
  const next = envelopeStep(envelope, loudness, dtMs, FIELD_ENVELOPE)
  return {
    envelope: loudness === 0 && next < FIELD_FLOOR ? 0 : next,
    ripples: (ripple ? [...ripples, ripple] : ripples).filter((r) => now - r.bornAt < RIPPLE_LIFE_MS),
    lastRipple: ripple ? now : lastRipple,
  }
}
