'use client'

import { useLayoutEffect } from 'react'

/** Attribute on <html> that switches the hidden state in globals.css on. */
const ARMED = 'data-reveal-armed'
/** Marks a block that has lifted in; globals.css settles it. */
const REVEALED = 'data-revealed'
/** How far above the viewport's bottom edge a block has to be before it starts, in % of the viewport. */
const BOTTOM_INSET_PERCENT = 16

/**
 * Sections lift and settle as they scroll into view — the one motion idiom the
 * brand allows. Blocks opt in with `data-reveal="<order>"`; the order's stagger
 * is CSS (globals.css), so this only arms, observes and marks.
 *
 * The hidden state is declared in CSS and only *armed* here, in a layout effect,
 * so it is in place before the browser paints what React renders. Nothing is
 * armed under reduced motion or without IntersectionObserver: every block then
 * stays as the server rendered it, settled.
 *
 * Each block waits for its own trigger and nothing else reveals it — no
 * watchdog timer, which in the prototype once settled the whole page after four
 * seconds on the hero and left nothing to see.
 */
export function useReveal() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || blocks.length === 0 || !('IntersectionObserver' in window)) return

    const reveal = (block: Element) => {
      block.setAttribute(REVEALED, '')
    }

    /*
     * The server's HTML is painted before this runs, settled. A block the
     * reader can already see — a reload halfway down, a `/#bang-gia` link
     * opened in a new tab — must stay where it is rather than vanish and lift
     * in again, so it is marked before arming. Any part in the viewport counts
     * as seen; the observer's bottom inset applies only to blocks still below
     * it. All reads, then all writes.
     */
    const measured = blocks.map((block) => ({ block, top: block.getBoundingClientRect().top }))
    const waiting: HTMLElement[] = []
    for (const { block, top } of measured) {
      if (top < window.innerHeight) reveal(block)
      else waiting.push(block)
    }

    root.setAttribute(ARMED, '')

    /*
     * The margins make one rule out of two requirements. The bottom inset is
     * the point of the effect: a block has to be properly inside the viewport,
     * not merely touching its lower edge, before it starts — with the trigger
     * on the edge the arc was over before the block had scrolled far enough to
     * look at. The very tall top margin covers the other half: it counts
     * anything already above the viewport as intersecting, so a block jumped
     * clean over — an anchor link, a flung scroll, a restored scroll position —
     * is revealed rather than left invisible with its one chance gone.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          reveal(entry.target)
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: `200000px 0px -${String(BOTTOM_INSET_PERCENT)}% 0px`, threshold: 0 },
    )
    waiting.forEach((block) => {
      observer.observe(block)
    })

    // A print job has no scroll to trigger on, so hand it the settled page.
    const revealAll = () => {
      blocks.forEach(reveal)
    }
    window.addEventListener('beforeprint', revealAll)

    /*
     * Disarming is enough to undo this: without the attribute the hidden state
     * stops matching and every block renders settled. Blocks that already
     * revealed keep their marker, so nothing blinks on the way out.
     */
    return () => {
      observer.disconnect()
      window.removeEventListener('beforeprint', revealAll)
      root.removeAttribute(ARMED)
    }
  }, [])
}
