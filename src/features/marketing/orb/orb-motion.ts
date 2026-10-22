/**
 * The orb's arithmetic, kept free of the DOM so it can be checked on its own:
 * where it sits in each pose, whether a move is a flight or a jump, how the
 * voice's loudness becomes the orb's `--amp`, and how it shapes the aura around
 * the orb on the call screen (`aura.ts` draws what this computes).
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
 * The sphere's own smoothing: it brightens a touch on a syllable and settles
 * through a pause. Equal to closing 45% and 10% of the gap per frame at 60fps.
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
 * The aura: her voice on the call screen, a soft light behind the sphere that
 * `aura.ts` draws from what this computes. Every length is in orb radii, so it
 * keeps its proportions around a 200px orb on a phone and a 320px one on a
 * desktop.
 */

/**
 * How far the aura's canvas reaches from the orb's centre: 2.4 orb diameters
 * edge to edge. Every blob stays inside it, or its gradient would be cut into
 * a hard edge.
 */
export const AURA_REACH = 2.4

/** Fast enough to follow a phrase, slow enough that a single syllable never flickers it. */
export const AURA_ENVELOPE: Envelope = { attackMs: 110, releaseMs: 380 }
/*
 * Measured on a live call (2026-10-22): while she speaks the SDK's output
 * volume has a median of 0.15–0.28, a 90th percentile of 0.31–0.41 and peaks
 * of 0.37–0.45, and dips to 0–0.10 between words. The floor lets those dips
 * read as silence, so a pause contracts the aura; the gain puts her loudest
 * syllable at 1 and ordinary speech near 0.5.
 */
const AURA_NOISE_FLOOR = 0.05
const AURA_GAIN = 2.6
/** The aura answers her voice this much more strongly than the envelope alone… */
const AURA_INTENSITY = 1.45
/** …up to this. */
export const AURA_MAX = 1.4
/** Below this a fading envelope is at rest. */
const AURA_FLOOR = 0.002
/** How much of its opacity a blob keeps in silence. */
const AURA_REST_ALPHA = 0.35
const AURA_MIN_ALPHA = 0.02
const AURA_MAX_ALPHA = 0.3

/** Her raw output volume as the aura's loudness, 0–1. */
export function auraLoudness(volume: number): number {
  return Math.min(1, Math.max(0, (volume - AURA_NOISE_FLOOR) * AURA_GAIN))
}

/** The envelope as the aura shows it: 1.45 times as strong, never past `AURA_MAX`. */
export function visualAmplitude(envelope: number): number {
  return Math.min(AURA_MAX, Math.max(0, envelope * AURA_INTENSITY))
}

/** The whole aura's size: drawn in a little in silence, past its rest when she is loud. */
function auraScale(visual: number): number {
  return 0.92 + 0.19 * visual
}

export type AuraTone = 'deep' | 'clay' | 'amber' | 'cream'

/**
 * One soft radial gradient of the aura. Its centre sits `offset` from the
 * orb's, at x = cos(a)·offset and y = sin(a·k)·offset, where a wanders around
 * `angle` on the blob's own cycle. `k` is never 1, so the centre never moves
 * on a circle, and no two blobs share a cycle, so the aura never turns as one.
 */
export interface AuraBlob {
  /** Radians. */
  angle: number
  k: number
  /** How far the angle wanders either side of `angle`, radians. */
  wander: number
  /** One drift cycle, 6–15 s. */
  periodMs: number
  phase: number
  /** Orb radii from the orb's centre, at rest. */
  offset: number
  /** Orb radii, at rest. */
  radius: number
  /** Opacity at full voice, before the response; most blobs sit near the low end. */
  alpha: number
  /** How strongly it answers her voice; it differs per blob, so regions swell by different amounts. */
  response: number
  /** The colour at its centre, then at its edge. */
  tones: readonly [core: AuraTone, rim: AuraTone]
}

/** Layer 1: just past the sphere's rim, about 1.3 orb diameters across, off-centre so it is never a ring. */
export const AURA_NEAR: readonly AuraBlob[] = [
  { angle: 0.9, k: 1.05, wander: 0.6, periodMs: 13000, phase: 0.3, offset: 0.1, radius: 1.3, alpha: 0.14, response: 1, tones: ['amber', 'clay'] },
  { angle: 3.2, k: 0.94, wander: 0.5, periodMs: 9800, phase: 2.4, offset: 0.08, radius: 1.28, alpha: 0.12, response: 0.8, tones: ['cream', 'amber'] },
  { angle: 5, k: 1.09, wander: 0.7, periodMs: 15000, phase: 4.1, offset: 0.12, radius: 1.32, alpha: 0.1, response: 1.2, tones: ['amber', 'clay'] },
]

/** Layer 2: seven asymmetric lobes, the part of the aura that swells and bulges. */
export const AURA_LOBES: readonly AuraBlob[] = [
  { angle: 0.35, k: 1.08, wander: 0.32, periodMs: 7200, phase: 0.4, offset: 0.34, radius: 0.92, alpha: 0.16, response: 1.15, tones: ['clay', 'amber'] },
  { angle: 1.2, k: 0.93, wander: 0.45, periodMs: 11800, phase: 2.1, offset: 0.42, radius: 0.86, alpha: 0.12, response: 0.7, tones: ['cream', 'amber'] },
  { angle: 2.05, k: 1.12, wander: 0.28, periodMs: 6400, phase: 4.4, offset: 0.28, radius: 0.94, alpha: 0.18, response: 1.3, tones: ['clay', 'amber'] },
  { angle: 2.9, k: 0.95, wander: 0.4, periodMs: 14600, phase: 1.3, offset: 0.46, radius: 0.82, alpha: 0.1, response: 0.85, tones: ['deep', 'clay'] },
  { angle: 4.05, k: 1.06, wander: 0.36, periodMs: 9300, phase: 5.2, offset: 0.38, radius: 0.9, alpha: 0.14, response: 1, tones: ['amber', 'cream'] },
  { angle: 4.7, k: 0.91, wander: 0.5, periodMs: 12700, phase: 3, offset: 0.34, radius: 0.95, alpha: 0.17, response: 1.2, tones: ['clay', 'amber'] },
  { angle: 5.6, k: 1.1, wander: 0.3, periodMs: 8100, phase: 0.9, offset: 0.44, radius: 0.84, alpha: 0.11, response: 0.75, tones: ['cream', 'clay'] },
]

/**
 * Layer 3: an extremely diffuse haze, about 2.1 orb diameters across while she
 * speaks — less in silence, more when she is loud, always inside the canvas.
 */
export const AURA_HAZE: readonly AuraBlob[] = [
  { angle: 0.6, k: 1.04, wander: 0.8, periodMs: 14000, phase: 1.7, offset: 0.08, radius: 1.8, alpha: 0.06, response: 0.6, tones: ['clay', 'clay'] },
  { angle: 3.7, k: 0.96, wander: 0.7, periodMs: 11000, phase: 4.6, offset: 0.1, radius: 1.75, alpha: 0.05, response: 0.5, tones: ['amber', 'amber'] },
]

/** Where a blob is drawn this frame, in orb radii from the orb's centre. Reused, never allocated per frame. */
export interface BlobPlacement {
  x: number
  y: number
  radius: number
  alpha: number
}

/** How far a full bulge pushes its lobe out, in radii, and how much it grows it. */
const BULGE_PUSH = 0.16
const BULGE_GROW = 0.2
const BULGE_ALPHA = 0.05

/**
 * Places `blob` at `ms`, for a voice at `visual` and a bulge of 0–1. `still`
 * is a visitor who asked for less motion: the blob keeps its resting place
 * and size, and only its opacity follows her voice.
 */
export function placeBlob(out: BlobPlacement, blob: AuraBlob, ms: number, visual: number, bulge: number, still: boolean): void {
  const t = still ? 0 : ms
  const moving = still ? 0 : visual
  const push = still ? 0 : bulge
  const cycle = (2 * Math.PI * t) / blob.periodMs + blob.phase
  const angle = blob.angle + blob.wander * Math.sin(cycle)
  // A slower, unrelated breath of the offset, so a lobe's distance and its angle never repeat together.
  const breath = 1 + 0.1 * Math.sin(0.73 * cycle + 1.3)
  const offset = blob.offset * breath * (1 + 0.35 * blob.response * moving) + BULGE_PUSH * push
  out.x = Math.cos(angle) * offset
  out.y = Math.sin(angle * blob.k) * offset
  out.radius = blob.radius * auraScale(moving) * (1 + 0.08 * blob.response * moving) * (1 + BULGE_GROW * push)
  const alpha = blob.alpha * (AURA_REST_ALPHA + 0.5 * blob.response * visual) + BULGE_ALPHA * bulge
  out.alpha = Math.min(AURA_MAX_ALPHA, Math.max(AURA_MIN_ALPHA, alpha))
}

/*
 * A peak: her loudness rising clearly above the aura's own envelope. From
 * silence any clear onset counts; while she talks steadily only a syllable
 * well above her own level does, so ordinary speech never sets the aura
 * beating.
 */
const PEAK_RISE = 0.12
const PEAK_RISE_SHARE = 0.5
/** …is at least this loud… */
const PEAK_FLOOR = 0.2
/** …and comes this long after the last one, never sooner than a bulge lives, so one bulge is alive at a time. */
const PEAK_GAP_MS = 420
/** A bulge swells in over this, then eases out until `BULGE_MS`. */
const BULGE_RISE_MS = 70
export const BULGE_MS = 420
/** A peak this strong bulges a second lobe too, at this share of the first one's bulge. */
const SECOND_LOBE_STRENGTH = 0.7
const SECOND_LOBE_SHARE = 0.6

/** Whether this frame's loudness is a peak worth a bulge. */
export function isPeak(loudness: number, envelope: number, msSinceLast: number): boolean {
  return (
    loudness >= PEAK_FLOOR &&
    loudness - envelope >= PEAK_RISE + PEAK_RISE_SHARE * envelope &&
    msSinceLast >= PEAK_GAP_MS
  )
}

/** 0.4–1, from how far the peak rose above the envelope: a faint peak still shows, a sharp one is capped. */
export function peakStrength(loudness: number, envelope: number): number {
  return Math.min(1, Math.max(0.4, (loudness - envelope) / 0.3))
}

/** A bulge of `strength`, `ageMs` after its peak: a quick swell, a smooth fall, gone by `BULGE_MS`. */
export function bulgeAt(ageMs: number, strength: number): number {
  if (ageMs < 0 || ageMs >= BULGE_MS) return 0
  if (ageMs < BULGE_RISE_MS) {
    const f = ageMs / BULGE_RISE_MS
    return strength * f * f * (3 - 2 * f)
  }
  const f = 1 - (ageMs - BULGE_RISE_MS) / (BULGE_MS - BULGE_RISE_MS)
  return strength * f * f
}

/** The aura's state between frames. Mutated in place by `stepAura`, so a frame allocates nothing. */
export interface AuraState {
  /** Her loudness through `AURA_ENVELOPE`, 0–1. */
  envelope: number
  lastPeak: number
  bulgeFrom: number
  bulgeStrength: number
  /** The lobes the live bulge swells, as indices into `AURA_LOBES`; -1 for none. */
  bulgeFirst: number
  bulgeSecond: number
}

export function createAuraState(): AuraState {
  return { envelope: 0, lastPeak: -Infinity, bulgeFrom: -Infinity, bulgeStrength: 0, bulgeFirst: -1, bulgeSecond: -1 }
}

/** The angular distance between two angles, 0–π. */
function angleBetween(a: number, b: number): number {
  const d = Math.abs(a - b) % (2 * Math.PI)
  return d > Math.PI ? 2 * Math.PI - d : d
}

/**
 * One frame of the aura. `loudness` is `auraLoudness` of her volume, or 0 when
 * there is none; `pick`, 0–1, is where a peak this frame lands, so a bulge
 * swells the one or two lobes nearest a random angle — never all of them, and
 * never a pulse around the whole aura. `still` takes no bulges at all.
 */
export function stepAura(state: AuraState, now: number, dtMs: number, loudness: number, pick: number, still: boolean): void {
  if (!still && isPeak(loudness, state.envelope, now - state.lastPeak)) {
    const at = pick * 2 * Math.PI
    let first = -1
    let second = -1
    for (const [i, lobe] of AURA_LOBES.entries()) {
      const distance = angleBetween(lobe.angle, at)
      const firstLobe = AURA_LOBES[first]
      const secondLobe = AURA_LOBES[second]
      if (!firstLobe || distance < angleBetween(firstLobe.angle, at)) {
        second = first
        first = i
      } else if (!secondLobe || distance < angleBetween(secondLobe.angle, at)) {
        second = i
      }
    }
    const strength = peakStrength(loudness, state.envelope)
    state.lastPeak = now
    state.bulgeFrom = now
    state.bulgeStrength = strength
    state.bulgeFirst = first
    state.bulgeSecond = strength >= SECOND_LOBE_STRENGTH ? second : -1
  }
  const next = envelopeStep(state.envelope, loudness, dtMs, AURA_ENVELOPE)
  state.envelope = loudness === 0 && next < AURA_FLOOR ? 0 : next
}

/** The bulge on lobe `index` (into `AURA_LOBES`) at `now`, 0–1. */
export function lobeBulge(state: AuraState, index: number, now: number): number {
  const age = now - state.bulgeFrom
  if (index === state.bulgeFirst) return bulgeAt(age, state.bulgeStrength)
  if (index === state.bulgeSecond) return bulgeAt(age, state.bulgeStrength * SECOND_LOBE_SHARE)
  return 0
}

/** True once she is silent, the envelope has settled and no bulge is alive: the aura's last frame is drawn. */
export function auraAtRest(state: AuraState, now: number): boolean {
  return state.envelope === 0 && now - state.bulgeFrom >= BULGE_MS
}
