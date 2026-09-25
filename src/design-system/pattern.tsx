import { useId } from 'react'
import type { CSSProperties } from 'react'

/*
 * The five Fonnus patterns — "Hoạ tiết" — plus the divider band and the night
 * dots. Repeating tiles for section grounds, dividers and quiet emphasis.
 *
 * Rules from the reference (docs/visual-language.md):
 *   - never darker than 12% (the band goes to 22%),
 *   - one kind of pattern per page,
 *   - on a night surface only the dots (`night-dots`) — arcs read too loud.
 *
 * The component fills its positioned parent (`position: absolute; inset: 0`),
 * so the parent must be `position: relative` and usually clip its overflow.
 * Ink comes from `currentColor`; the accent from `--icon-accent`. It holds no
 * state, so it renders on the server (`useId` is allowed there).
 */

export type PatternName =
  | 'rings' /* Vòng reo — rising arcs stacked like scales. Opening slides, footers. Tile 40 × 20. */
  | 'dots' /* Chấm nhịp — an ink dot grid with a sparse terracotta dot: the answered call. Tile 22. */
  | 'arcs' /* Cung chéo — the arc turned 45° on blush. Section dividers, price cards. Tile 26. */
  | 'grid' /* Lưới lịch — empty calendar cells. Behind charts, hour tables, figures. Tile 28. */
  | 'ticks' /* Dấu thanh — the slanted tone mark, a nod to Vietnamese. Sage grounds only. Tile 24. */
  | 'band' /* Dải phân cách — rings at ×3 with a terracotta lead arc. Divider bands. Tile 120 × 60. */
  | 'night-dots' /* Chấm nhịp on night: cream dots at 12%, no accent. Tile 22. */

export interface PatternProps {
  name: PatternName
  /** Multiplies the tile. The reference's divider uses the rings at ×3 — that is what `band` already is. */
  scale?: number
  className?: string
  style?: CSSProperties
}

const ACCENT = 'var(--icon-accent)'
/* Lemongrass, the second voice. `--chart-2` is the alias that carries it. */
const TICK = 'var(--chart-2)'

export function Pattern({ name, scale = 1, className, style }: PatternProps) {
  const uid = useId().replace(/[^\w-]/g, '')
  const id = `fp-${name}-${uid}`
  const accentId = `${id}-a`
  const transform = scale !== 1 ? `scale(${String(scale)})` : undefined

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <defs>
        {name === 'rings' ? (
          <pattern id={id} width="40" height="20" patternUnits="userSpaceOnUse" patternTransform={transform}>
            <path d="M0 20A20 20 0 0 1 40 20" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.16" />
          </pattern>
        ) : name === 'dots' ? (
          <>
            <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform={transform}>
              <circle cx="11" cy="11" r="1.7" fill="currentColor" opacity="0.18" />
            </pattern>
            <pattern id={accentId} width="110" height="110" patternUnits="userSpaceOnUse" patternTransform={transform}>
              <circle cx="55" cy="33" r="2.4" fill={ACCENT} opacity="0.75" />
            </pattern>
          </>
        ) : name === 'arcs' ? (
          <pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform={transform}>
            <path d="M0 26A26 26 0 0 1 26 0" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.14" />
          </pattern>
        ) : name === 'grid' ? (
          <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform={transform}>
            <path d="M0 0H28M0 0V28" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1" />
            <circle cx="0" cy="0" r="1.4" fill="currentColor" opacity="0.14" />
          </pattern>
        ) : name === 'ticks' ? (
          <pattern
            id={id}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform={transform ? `${transform} rotate(-12)` : 'rotate(-12)'}
          >
            <path d="M6 15l5-6" fill="none" stroke={TICK} strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
          </pattern>
        ) : name === 'band' ? (
          <pattern id={id} width="120" height="60" patternUnits="userSpaceOnUse" patternTransform={transform}>
            <path d="M0 60A60 60 0 0 1 120 60" fill="none" stroke={ACCENT} strokeWidth="3" opacity="0.22" />
            <path d="M30 60A30 30 0 0 1 90 60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.14" />
          </pattern>
        ) : (
          <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform={transform}>
            <circle cx="11" cy="11" r="1.6" fill="currentColor" opacity="0.12" />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {name === 'dots' ? <rect width="100%" height="100%" fill={`url(#${accentId})`} /> : null}
    </svg>
  )
}
