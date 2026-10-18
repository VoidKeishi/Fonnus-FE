import { FIELD_AT_REST, edgeWeight, fieldEdge, fieldSpread, rippleOffset, stepField, swellOffset } from './orb-motion'

/**
 * Chấm nhịp on the call screen, moved by her voice.
 *
 * The same grid as the `dots` pattern — ink dots on a 22px tile, one terracotta
 * dot per 110px — drawn on a canvas so each dot can move. It is still until she
 * speaks; then the slow envelope of her loudness widens the field's soft edge
 * and pushes the dots near the orb outward, and a strong peak sends a ripple
 * through it (`orb-motion.ts` holds the arithmetic and the reasons). Opacity
 * rises only from 0.18 to 0.22, the pattern ceiling.
 *
 * This module draws and keeps the field's state; `orb.tsx` owns the one
 * animation loop that advances it, and `call-overlay.tsx` mounts the canvas.
 */
const TILE = 22
const DOT_RADIUS = 1.7
const ACCENT_RADIUS = 2.4
/* The accent tile is 110px with its dot at (55, 33): every fifth column from
   the third, every fifth row from the second. */
const ACCENT_EVERY = 5
const ACCENT_COLUMN = 2
const ACCENT_ROW = 1
const DOT_ALPHA_REST = 0.18
const DOT_ALPHA_LOUD = 0.22
const ACCENT_ALPHA = 0.75
/** A sharper canvas than this costs pixels nobody sees on a 1.7px dot. */
const MAX_PIXEL_RATIO = 2

export interface DotField {
  /**
   * One frame of her voice: `loudness` is the live level, or null when there
   * is none. Returns false once the field is at rest and its last frame drawn,
   * so the loop may stop for it.
   */
  advance: (now: number, loudness: number | null) => boolean
  /** Re-measures the canvas and the orb's slot, then redraws. */
  layout: () => void
  /** Back to the resting field at once, for a visitor who asked for less motion. */
  settle: () => void
}

/**
 * Null when the browser gives no 2D context; the call screen then has no dots.
 * Ink is the canvas's own `color`, the accent `--icon-accent`, both read once.
 */
export function createDotField(canvas: HTMLCanvasElement, slot: HTMLElement): DotField | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const style = getComputedStyle(canvas)
  const ink = style.color
  const accent = style.getPropertyValue('--icon-accent').trim() || ink

  let width = 0
  let height = 0
  let cx = 0
  let cy = 0
  let radius = 0
  let state = FIELD_AT_REST
  let lastAdvance = -Infinity

  const draw = (now: number) => {
    ctx.clearRect(0, 0, width, height)
    if (radius <= 0) return
    const { envelope, ripples } = state
    const spread = fieldSpread(envelope)
    const edge = fieldEdge(spread) * radius
    const dotAlpha = DOT_ALPHA_REST + (DOT_ALPHA_LOUD - DOT_ALPHA_REST) * spread
    const firstColumn = Math.max(0, Math.floor((cx - edge) / TILE))
    const lastColumn = Math.min(Math.floor(width / TILE), Math.ceil((cx + edge) / TILE))
    const firstRow = Math.max(0, Math.floor((cy - edge) / TILE))
    const lastRow = Math.min(Math.floor(height / TILE), Math.ceil((cy + edge) / TILE))
    let fill = ''

    for (let row = firstRow; row <= lastRow; row++) {
      const dy = row * TILE + TILE / 2 - cy
      for (let column = firstColumn; column <= lastColumn; column++) {
        const dx = column * TILE + TILE / 2 - cx
        const distance = Math.hypot(dx, dy)
        const weight = edgeWeight(distance / edge)
        if (weight <= 0) continue
        const r = distance / radius
        let push = swellOffset(r, spread)
        if (ripples.length > 0) {
          const angle = Math.atan2(dy, dx)
          for (const ripple of ripples) push += rippleOffset(r, angle, now - ripple.bornAt, ripple)
        }
        const stretch = r > 0 ? (r + push) / r : 1
        const accented = column % ACCENT_EVERY === ACCENT_COLUMN && row % ACCENT_EVERY === ACCENT_ROW
        const color = accented ? accent : ink
        if (color !== fill) {
          ctx.fillStyle = color
          fill = color
        }
        ctx.globalAlpha = (accented ? ACCENT_ALPHA : dotAlpha) * weight
        ctx.beginPath()
        ctx.arc(cx + dx * stretch, cy + dy * stretch, accented ? ACCENT_RADIUS : DOT_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  const advance = (now: number, loudness: number | null) => {
    const dt = now - lastAdvance
    lastAdvance = now
    const next = stepField(state, now, dt, loudness ?? 0, Math.random() * Math.PI * 2)
    if (!next) return false
    state = next
    draw(now)
    return true
  }

  const layout = () => {
    const box = canvas.getBoundingClientRect()
    const spot = slot.getBoundingClientRect()
    const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1)
    width = box.width
    height = box.height
    cx = spot.left - box.left + spot.width / 2
    cy = spot.top - box.top + spot.height / 2
    radius = spot.width / 2
    // Resizing the bitmap also resets the context's transform.
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    draw(performance.now())
  }

  const settle = () => {
    state = FIELD_AT_REST
    draw(performance.now())
  }

  return { advance, layout, settle }
}
