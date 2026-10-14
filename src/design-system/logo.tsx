import type { CSSProperties, ImgHTMLAttributes } from 'react'

/*
 * Two variants, because two files exist. The prototype's Logo also typed
 * `mark-mono` and `stacked`, but neither SVG was ever drawn and nothing
 * referenced them — a `variant="stacked"` rendered a broken image against a
 * type that compiled. Re-add a variant together with its file (ADR 0002).
 */
type Variant = 'mark' | 'mark-dark' | 'horizontal' | 'horizontal-dark'

const FILES: Record<Variant, string> = {
  mark: '/fonnus-mark.svg',
  'mark-dark': '/fonnus-mark-dark.svg',
  horizontal: '/fonnus-lockup-horizontal.svg',
  'horizontal-dark': '/fonnus-lockup-horizontal-dark.svg',
}

export interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'height' | 'src' | 'alt'> {
  variant?: Variant
  height?: number
  /** Pads the logo by the height of its arc, the guide's clearspace rule. */
  clearspace?: boolean
  style?: CSSProperties
}

export function Logo({
  variant = 'horizontal',
  height = 32,
  clearspace = false,
  style,
  className = '',
  ...rest
}: LogoProps) {
  // Below 24px the wordmark stops being legible, so the lockup drops to the mark.
  const resolved: Variant =
    height >= 24 ? variant : variant === 'horizontal' ? 'mark' : variant === 'horizontal-dark' ? 'mark-dark' : variant

  return (
    /* Every logo is an SVG of a known size and `images.unoptimized` is set
       (next.config.ts), so next/image would add a component and a layout pass
       and optimize nothing. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={FILES[resolved]}
      alt="Fonnus"
      className={`block w-auto box-content ${className}`}
      style={{ height, padding: clearspace ? height * 0.3 : 0, ...style }}
      {...rest}
    />
  )
}

export interface LogoMarkProps {
  size?: number
  className?: string
  /** On the arc alone, for the one place it moves: the header's waitlist button. */
  arcClassName?: string
}

/**
 * The mark drawn inline, in `currentColor`, so it can sit inside a button and
 * take that button's text colour — and so the arc can be animated, which an
 * `<img>` of the same file cannot be. The light and night files above stay the
 * logo everywhere else.
 */
export function LogoMark({ size = 18, className = '', arcClassName = '' }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <path
        d="M17 20 A21 21 0 0 1 47 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        className={arcClassName}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <circle cx="32" cy="42" r="18" fill="currentColor" />
    </svg>
  )
}
