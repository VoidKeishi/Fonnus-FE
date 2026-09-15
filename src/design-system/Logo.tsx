import type { CSSProperties, ImgHTMLAttributes } from 'react'

/*
 * Two variants, because two files exist. The prototype's Logo also typed
 * `mark-mono` and `stacked`, but neither SVG was ever drawn and nothing
 * referenced them — a `variant="stacked"` rendered a broken image against a
 * type that compiled. Re-add a variant together with its file (ADR 0002).
 */
type Variant = 'mark' | 'mark-dark' | 'horizontal'

const FILES: Record<Variant, string> = {
  mark: '/fonnus-mark.svg',
  'mark-dark': '/fonnus-mark-dark.svg',
  horizontal: '/fonnus-lockup-horizontal.svg',
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
  const resolved: Variant = variant === 'horizontal' && height < 24 ? 'mark' : variant

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
