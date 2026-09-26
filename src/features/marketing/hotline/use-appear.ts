'use client'

import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

/*
 * The prototype's `useAppear` from its app kit, ported for the hotline form
 * (marketing never imports `src/ui/`). A row grows into its place over 200ms
 * on the rising arc and the rows below slide down with it; deleting runs the
 * same 200ms backwards (docs/ui-ux-principles.md §6).
 *
 * It animates the row itself, not a wrapper, measuring its height once. Rows
 * are found through the list: each carries `data-appear-id`, so the hook holds
 * one ref and no per-row callbacks.
 */

/** `--duration-base` and `--ease-arc` (tokens/motion.css), in the form the Web Animations API takes. */
const DURATION_MS = 200
const EASE = 'cubic-bezier(.2,.7,.3,1)'

/** How far past the animation's end the fallback timer waits; see `whenDone`. */
const FLOOR_SLACK_MS = 300

const ROW_ATTRIBUTE = 'data-appear-id'

/** Spread on a row's outermost element so the list can find it. */
export function appearRow(id: string): Record<typeof ROW_ATTRIBUTE, string> {
  return { [ROW_ATTRIBUTE]: id }
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function rowsOf(list: HTMLElement | null): HTMLElement[] {
  return list ? Array.from(list.querySelectorAll<HTMLElement>(`:scope > [${ROW_ATTRIBUTE}]`)) : []
}

/**
 * The gap the parent still reserves for a row that is collapsing. Without it
 * the list holds a row-gap's worth of space for the whole animation and closes
 * it in one frame at the end. The gap sits after every child but the last,
 * where it sits before instead.
 */
function gapAround(el: HTMLElement): { top: number; bottom: number } {
  const parent = el.parentElement
  if (!parent) return { top: 0, bottom: 0 }
  const gap = parseFloat(getComputedStyle(parent).rowGap)
  if (!Number.isFinite(gap) || gap <= 0) return { top: 0, bottom: 0 }
  if (el.nextElementSibling) return { top: 0, bottom: gap }
  return { top: el.previousElementSibling ? gap : 0, bottom: 0 }
}

/**
 * One lift-and-settle between "not there" and the row's real height. Padding,
 * borders and the parent's gap go with it, or the row would still stand a
 * couple of dozen pixels tall at the shut end. `clip-path` clips the inputs to
 * the shrinking box only while it moves — a row left clipped would cut the
 * focus ring off what is inside it — and, being part of the animation, it
 * needs no style written onto the element and none restored after.
 */
function play(el: HTMLElement, direction: 'in' | 'out'): Animation {
  const cs = getComputedStyle(el)
  const gap = gapAround(el)
  const open: Keyframe = {
    height: `${String(el.getBoundingClientRect().height)}px`,
    paddingTop: cs.paddingTop,
    paddingBottom: cs.paddingBottom,
    borderTopWidth: cs.borderTopWidth,
    borderBottomWidth: cs.borderBottomWidth,
    marginTop: cs.marginTop,
    marginBottom: cs.marginBottom,
    opacity: '1',
    clipPath: 'inset(0)',
  }
  const shut: Keyframe = {
    height: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
    borderTopWidth: '0px',
    borderBottomWidth: '0px',
    marginTop: `${String(parseFloat(cs.marginTop) - gap.top)}px`,
    marginBottom: `${String(parseFloat(cs.marginBottom) - gap.bottom)}px`,
    opacity: '0',
    clipPath: 'inset(0)',
  }
  return el.animate(direction === 'in' ? [shut, open] : [open, shut], {
    duration: DURATION_MS,
    easing: EASE,
    // A row on its way out stays shut until React unmounts it.
    fill: direction === 'out' ? 'forwards' : 'none',
  })
}

/**
 * Run `after` once the animation ends, however it ends. `finish` does not fire
 * while the document timeline is stopped (a throttled window, a parked
 * compositor), and a delete waiting on it alone would never apply — so a timer
 * is the floor: the animation's own end time plus slack. The timer starts now
 * but the animation only on the next frame, so a floor at exactly the end time
 * would win the race and unmount the row a few pixels short of closed. The
 * slack is the prototype's 300ms. Whichever comes first wins, once.
 */
function whenDone(animation: Animation, after: () => void) {
  let ran = false
  const endTime = animation.effect?.getComputedTiming().endTime
  const once = () => {
    if (ran) return
    ran = true
    window.clearTimeout(floor)
    after()
  }
  const floor = window.setTimeout(once, (typeof endTime === 'number' ? endTime : DURATION_MS) + FLOOR_SLACK_MS)
  animation.addEventListener('finish', once)
  animation.addEventListener('cancel', once)
}

export interface Appear {
  /** On the list element whose direct children are the rows. */
  listRef: RefObject<HTMLDivElement | null>
  /** Collapse the row, then apply the removal. A second press while it is going is ignored. */
  leave: (id: string, remove: () => void) => void
  /** How many rows are collapsing right now — still in the list, already on their way out. */
  leaving: () => number
}

/**
 * Entrances find themselves: any id that was not in the list at the last
 * commit plays. Exits cannot — by the time an effect could see the row it is
 * unmounted — so a delete goes through `leave`, which collapses the row first
 * and applies the change after it; `remove` must read the list then, through
 * an updater, not close over it now.
 *
 * The first commit is the list arriving, not rows appearing in it, so nothing
 * plays on mount. Under reduced motion every row simply appears and every
 * delete is immediate.
 */
export function useAppear(ids: readonly string[]): Appear {
  const listRef = useRef<HTMLDivElement>(null)
  const seen = useRef<ReadonlySet<string> | null>(null)
  const going = useRef(new Set<string>())
  // A string, so the effect runs when the ids change rather than on every render.
  const idList = ids.join(' ')

  useLayoutEffect(() => {
    const before = seen.current
    seen.current = new Set(idList.split(' '))
    if (!before || reducedMotion()) return
    for (const row of rowsOf(listRef.current)) {
      const id = row.getAttribute(ROW_ATTRIBUTE)
      if (id !== null && !before.has(id)) play(row, 'in')
    }
  }, [idList])

  function leave(id: string, remove: () => void) {
    if (going.current.has(id)) return
    const row = rowsOf(listRef.current).find((el) => el.getAttribute(ROW_ATTRIBUTE) === id)
    if (!row || reducedMotion()) {
      remove()
      return
    }
    going.current.add(id)
    whenDone(play(row, 'out'), () => {
      going.current.delete(id)
      remove()
    })
  }

  return { listRef, leave, leaving: () => going.current.size }
}
