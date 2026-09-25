import type { InputHTMLAttributes, ReactNode } from 'react'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label?: ReactNode
  hint?: ReactNode
  /** Classes for the whole row, the label element. */
  className?: string
}

/*
 * A real checkbox with `role="switch"`, laid invisibly over the drawn track, so
 * Space, the label click and a screen reader's "on/off" all come from the
 * platform. The track is prop-driven like the prototype's; hover and focus are
 * CSS, so the switch renders on the server and holds no state of its own.
 *
 * The input is transparent, which also hides the browser's focus outline on
 * it, so the track draws the focus ring instead.
 */
export function Switch({ label, hint, checked = false, disabled = false, className = '', ...rest }: SwitchProps) {
  return (
    <label
      className={[
        'flex items-center justify-between gap-3',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-ui text-body-sm leading-(--leading-body) font-medium">{label}</span>
        {hint ? <span className="text-ui leading-(--leading-body) text-text-muted">{hint}</span> : null}
      </span>
      <span
        className={[
          'relative h-[26px] w-11 flex-none rounded-pill',
          'transition-[background-color] duration-[var(--duration-base)] ease-out',
          'has-[:focus-visible]:shadow-[var(--ring-focus)]',
          checked ? 'bg-action-primary' : 'bg-[color-mix(in_srgb,var(--text-heading)_16%,transparent)]',
        ].join(' ')}
      >
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          className="absolute inset-0 m-0 cursor-[inherit] opacity-0"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none absolute top-[3px] left-[3px] size-5 rounded-[50%] bg-surface-card',
            'transition-transform duration-[var(--duration-base)] ease-arc',
            checked ? 'translate-x-[18px]' : '',
          ].join(' ')}
        />
      </span>
    </label>
  )
}
