import type { ButtonHTMLAttributes, ReactNode } from 'react'

/*
 * Hover, press and focus are CSS, not React state. The prototype tracked them
 * with `useState` because it styled inline; here Tailwind carries the variants,
 * which means a Button renders on the server and costs no JavaScript unless the
 * screen around it already needs some.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse'
type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, string> = {
  sm: 'gap-1.5 px-4 py-2 text-ui',
  md: 'gap-2 px-[22px] py-[11px] text-body-sm',
  lg: 'gap-2.5 px-7 py-[15px] text-body',
}

/*
 * Primary is `--action-primary` (#A04E1F, 5.4:1) with cream text — never plain
 * terracotta behind small text, which only reaches 4.0:1.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-action-primary text-text-on-accent hover:bg-action-primary-hover',
  secondary:
    'bg-action-secondary text-text-body shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-action-secondary-hover',
  ghost: 'bg-transparent text-text-accent hover:bg-[var(--action-ghost-hover)]',
  inverse: 'bg-[var(--cream-night)] text-[var(--night)] hover:bg-[var(--cream)]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-pill whitespace-nowrap',
        'font-ui font-medium leading-[1.2]',
        'cursor-pointer transition-[background-color,transform] duration-[120ms] ease-out',
        'active:scale-[var(--press-scale)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--ring-focus)]',
        'disabled:cursor-not-allowed disabled:opacity-[0.42] disabled:active:scale-100',
        SIZES[size],
        VARIANTS[variant],
        fullWidth ? 'flex w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      {children}
      {iconRight ? <span className="inline-flex shrink-0">{iconRight}</span> : null}
    </button>
  )
}
