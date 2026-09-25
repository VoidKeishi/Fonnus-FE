import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { FLIGHT_MS, ORB_BASE, PIN_AT, movesByFlight, orbPose, restingMode } from './orb-motion'
import type { OrbMode, OrbPose } from './orb-motion'

/*
 * There is exactly one orb on the page, and it moves between three poses
 * without ever being re-mounted (which would restart its canvas): docked on the
 * hero, pinned in the corner, and in the call screen (`orb-motion.ts`).
 *
 * Docked, it is `position: absolute` in page coordinates, so the browser
 * scrolls it with the dock natively — no scroll listener, and no frame of lag
 * between the page and the orb on a phone. Pinned and in the call it is
 * `position: fixed`. A change of pose swaps the two by FLIP: the orb is first
 * put, without transition, exactly where it is on screen in the new
 * coordinates, then flies from there. A flight home therefore runs in page
 * coordinates and lands on the dock even if the visitor keeps scrolling.
 *
 * Nothing is measured on a timer. The switch between docked and pinned comes
 * from an IntersectionObserver whose top margin is the 120px line; late layout
 * (fonts, a resized window, the page reflowing) from ResizeObservers on the
 * dock and the document, the font set's `ready`, and `resize` — the document's
 * box does not change when only the window's height does, and the corner pose
 * depends on it. The call pose is measured from the overlay's slot as it mounts.
 *
 * A visitor who asked for less motion gets every change of pose as a jump.
 */

/** The hero's empty box that says where "docked" is and how big to be. */
const DOCK_SELECTOR = '[data-orb-dock]'
const EASE = 'var(--ease-arc)'
/* The orb arrives with a fade; every transition keeps it so no move cuts it short. */
const FADE = `opacity 360ms ${EASE}`
const FLY = `transform ${String(FLIGHT_MS)}ms ${EASE}, ${FADE}`
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

type Resting = 'docked' | 'pinned'

export interface OrbPlacement {
  orbRef: RefObject<HTMLButtonElement | null>
  /** The call screen's empty slot the orb flies into. */
  spotRef: RefObject<HTMLDivElement | null>
  /** Null until the orb has been placed for the first time. */
  mode: OrbMode | null
}

export function useOrbPlacement(callOpen: boolean): OrbPlacement {
  const orbRef = useRef<HTMLButtonElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const [resting, setResting] = useState<Resting | null>(null)
  const callOpenRef = useRef(callOpen)
  const engine = useRef<{ mode: OrbMode | null; flightEndsAt: number }>({ mode: null, flightEndsAt: 0 })

  /** Measures and moves the orb. Returns where it rests, or null with no dock on the page. */
  const place = useCallback((): Resting | null => {
    const orb = orbRef.current
    const dock = document.querySelector(DOCK_SELECTOR)
    if (!orb || !dock) return null
    const dockBox = dock.getBoundingClientRect()
    const pose = orbPose({
      dock: dockBox,
      // The fixed orb's containing block: the width excludes a classic
      // scrollbar, which `innerWidth` counts. The height stays `innerHeight`:
      // the corner is tuned on phones, where the toolbars collapse and
      // `clientHeight` does not follow them.
      viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
      call: callOpenRef.current,
      spot: spotRef.current?.getBoundingClientRect() ?? null,
    })
    const state = engine.current
    const now = performance.now()
    // Read at the move, not once: the preference can change while the page is open.
    const fly =
      movesByFlight(state.mode, pose.mode, now < state.flightEndsAt) && !window.matchMedia(REDUCED_MOTION).matches
    if (fly && pose.mode !== state.mode) state.flightEndsAt = now + FLIGHT_MS
    applyPose(orb, pose, fly)
    state.mode = pose.mode
    return restingMode(dockBox)
  }, [])

  /** `place`, plus the React side of the pose: the label, the waves, what can be pressed. */
  const sync = useCallback(() => {
    const next = place()
    if (next) setResting(next)
  }, [place])

  // Opening or closing the call is a move of its own. The overlay's slot mounts
  // in the same commit, so it can be measured here, before the browser paints.
  useLayoutEffect(() => {
    callOpenRef.current = callOpen
    if (engine.current.mode === null) return
    place()
    if (!callOpen) return refreshRestingOnClose(setResting)
    const spot = spotRef.current
    if (!spot) return
    const slot = new ResizeObserver(sync)
    slot.observe(spot)
    return () => {
      slot.disconnect()
    }
  }, [callOpen, place, sync])

  useLayoutEffect(() => {
    const dock = document.querySelector(DOCK_SELECTOR)
    if (!dock) return
    // The first placement: instant, before the first paint, so the orb is on
    // the dock from the start rather than arriving from somewhere.
    place()

    const pin = new IntersectionObserver(sync, { rootMargin: `-${String(PIN_AT)}px 0px 0px 0px` })
    pin.observe(dock)
    const layout = new ResizeObserver(sync)
    layout.observe(dock)
    layout.observe(document.documentElement)
    window.addEventListener('resize', sync)
    let live = true
    void document.fonts.ready.then(() => {
      if (live) sync()
    })
    return () => {
      live = false
      pin.disconnect()
      layout.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [place, sync])

  return { orbRef, spotRef, mode: callOpen ? 'call' : resting }
}

/**
 * Closing the call also refreshes the resting pose, which the label follows:
 * the page may have moved under the call. It is taken from an observer's first
 * report — which `observe()` always delivers — so the state is set from a
 * callback rather than in the effect that closed the call. Returns the cleanup.
 */
function refreshRestingOnClose(setResting: (next: Resting) => void): (() => void) | undefined {
  const dock = document.querySelector(DOCK_SELECTOR)
  if (!dock) return undefined
  const first = new IntersectionObserver(([entry]) => {
    first.disconnect()
    if (entry) setResting(restingMode(entry.boundingClientRect))
  })
  first.observe(dock)
  return () => {
    first.disconnect()
  }
}

/**
 * The only place the orb's position, transform, transition and opacity are
 * written. They change per flight, outside React's render, which is why they
 * are written here rather than rendered.
 */
function applyPose(orb: HTMLElement, pose: OrbPose, fly: boolean): void {
  const position = pose.mode === 'docked' ? 'absolute' : 'fixed'
  if (fly && orb.style.position !== position) {
    const from = orb.getBoundingClientRect()
    orb.style.transition = FADE
    orb.style.position = position
    orb.style.transform = transformTo(orb, from.left, from.top, from.width / ORB_BASE)
    // Commit the start frame, so the flight runs from it.
    orb.getBoundingClientRect()
  }
  orb.style.position = position
  orb.style.transition = fly ? FLY : FADE
  orb.style.transform = transformTo(orb, pose.x, pose.y, pose.scale)
  orb.style.opacity = '1'
}

/**
 * A transform putting the orb's corner at viewport (x, y). Fixed, that is the
 * point itself; absolute, it is taken from the containing block's corner.
 */
function transformTo(orb: HTMLElement, x: number, y: number, scale: number): string {
  let dx = 0
  let dy = 0
  const block = orb.style.position === 'absolute' ? orb.offsetParent : null
  if (block) {
    const box = block.getBoundingClientRect()
    dx = box.left + block.clientLeft
    dy = box.top + block.clientTop
  }
  return `translate(${String(x - dx)}px,${String(y - dy)}px) scale(${String(scale)})`
}
