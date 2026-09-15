import type { CSSProperties, SVGAttributes } from 'react'
import { ICONS } from './icons'
import type { IconName, IconPrim } from './icons'

export type { IconName } from './icons'

/*
 * Inline SVG, not a CSS mask: a Fonnus icon has two colours — ink from
 * `currentColor`, and the one terracotta accent from `--icon-accent`. A mask
 * can only paint one.
 *
 * `--icon-accent` is `--terracotta` on light surfaces and `--terracotta-night`
 * on night ones (colors.css). A surface that is itself terracotta sets it to
 * `currentColor`, which collapses the icon to a single colour rather than
 * losing the accent into the ground.
 *
 * Stroke compensates for size so the shape never changes, only the line: at
 * 16px the stroke is 2.2 and the dot a touch bigger; from 32px up it thins
 * to 1.8 (the reference's "Bù nét theo cỡ").
 */

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'color' | 'name'> {
  name: IconName
  size?: number
  /** Ink colour. Defaults to `currentColor`. */
  color?: string
  /** Accent colour. Defaults to the surface's `--icon-accent`. */
  accent?: string
  style?: CSSProperties
}

function baseStroke(size: number): number {
  if (size <= 16) return 2.2
  if (size >= 32) return 1.8
  return 2
}

export function Icon({ name, size = 20, color = 'currentColor', accent, style, ...rest }: IconProps) {
  const prims: IconPrim[] = ICONS[name]
  const base = baseStroke(size)
  const scale = base / 2
  const small = size <= 16
  const accentColor = accent ?? 'var(--icon-accent, var(--terracotta))'

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={base}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', flex: '0 0 auto', color, ...style }}
      {...rest}
    >
      {prims.map((p, i) => {
        const paint = p.accent ? accentColor : 'currentColor'
        const w = p.w != null ? p.w * scale : undefined
        if ('d' in p) {
          return <path key={i} d={p.d} stroke={paint} strokeWidth={w} />
        }
        if ('c' in p) {
          const [cx, cy, r] = p.c
          if (p.fill) {
            return <circle key={i} cx={cx} cy={cy} r={small ? r + 0.2 : r} fill={paint} stroke="none" />
          }
          return <circle key={i} cx={cx} cy={cy} r={r} stroke={paint} strokeWidth={w} />
        }
        const [x, y, rw, rh, rx] = p.r
        return <rect key={i} x={x} y={y} width={rw} height={rh} rx={rx} stroke={paint} strokeWidth={w} />
      })}
    </svg>
  )
}
