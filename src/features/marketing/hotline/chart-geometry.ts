/*
 * The arithmetic behind the missed-calls chart: which column the pointer is
 * over, where the "Giờ làm việc" bracket sits, and where the tip goes. Pure,
 * so the edges — a pointer past the last column, a tip clamped at the card's
 * side, a tip flipped under a mark near the top of the screen — are tested
 * without a DOM.
 */

/** The column under a pointer at `x`, for `count` columns laid evenly across a track. */
export function slotAt(x: number, trackLeft: number, trackWidth: number, count: number): number {
  if (count <= 0 || trackWidth <= 0) return 0
  const i = Math.floor(((x - trackLeft) / trackWidth) * count)
  return Math.max(0, Math.min(count - 1, i))
}

export interface BracketSpan {
  /** CSS lengths for the open-topped line under the named columns. */
  left: string
  width: string
  /** The label's centre, as a share of the chart's width. */
  labelLeft: string
}

/** A run of columns `from`…`to` (inclusive) out of `count`, inset 10px at each end. */
export function bracketSpan(from: number, to: number, count: number): BracketSpan {
  const share = (n: number) => (n / count) * 100
  return {
    left: `calc(${String(share(from))}% + 10px)`,
    width: `calc(${String(share(to - from + 1))}% - 20px)`,
    labelLeft: `${String(share((from + to + 1) / 2))}%`,
  }
}

export interface Box {
  left: number
  top: number
  width: number
  bottom: number
}

export interface TipPlacement {
  /** Offset from the chart's top-left corner. */
  x: number
  y: number
  /** Where the caret sits along the tip, so it keeps pointing at the mark when the box is clamped. */
  caret: number
  /** Too close to the viewport's top edge: the tip hangs under the mark instead. */
  below: boolean
}

/** How far the tip may hang past the chart's side, and its distance from the mark. */
const OVERHANG = 6
const GAP = 10
/** The least room above the mark, from the viewport's top, before the tip flips below. */
const TOP_ROOM = 8

/**
 * Centred over the mark, clamped to the chart's width so it never leaves the
 * card on a phone, and flipped below the mark when there is no room above it.
 * `host` and `mark` are viewport boxes; `tip` is the tip's own size.
 */
export function placeTip(host: Box, mark: Box, tip: { width: number; height: number }): TipPlacement {
  const centre = mark.left + mark.width / 2 - host.left
  const x = Math.max(-OVERHANG, Math.min(host.width - tip.width + OVERHANG, centre - tip.width / 2))
  const below = mark.top - tip.height - GAP - 2 < TOP_ROOM
  const y = below ? mark.bottom - host.top + GAP : mark.top - host.top - tip.height - GAP
  return { x: Math.round(x), y: Math.round(y), caret: Math.round(centre - x), below }
}
