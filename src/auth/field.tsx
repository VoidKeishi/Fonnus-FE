'use client'

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

/**
 * The auth pill field.
 *
 * Deliberately not the design-system `Input`: that one draws a 12px bordered
 * box, and these screens borrow the landing hero's pill instead, so the first
 * control an owner meets after clicking "Dùng thử miễn phí" is the same shape
 * they just clicked.
 *
 * Focus thickens the existing ring rather than adding a second one, so the
 * control never grows on focus and nothing below it shifts.
 */
export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string
  error?: string | null
  /** Tabular figures — for phone numbers and codes, never for names. */
  numeric?: boolean
  /** Sits inside the pill, before the input. */
  prefix?: ReactNode
  /** Sits beside the label, e.g. the "Lần trước" mark on sign-in. */
  badge?: ReactNode
}

export function Field({ label, error, numeric = false, prefix, badge, id, ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="text-[13.5px] leading-snug font-medium text-text-body">
          {label}
        </label>
        {badge}
      </div>

      <div
        className={[
          'flex h-14 items-center gap-3 rounded-pill bg-surface-card px-[22px]',
          'transition-shadow duration-[var(--duration-fast)] ease-out',
          error
            ? 'shadow-[inset_0_0_0_1.5px_var(--error)] focus-within:shadow-[inset_0_0_0_2px_var(--error)]'
            : 'shadow-[inset_0_0_0_1.5px_rgba(38,31,24,0.14)] focus-within:shadow-[inset_0_0_0_2px_var(--focus-ring)]',
        ].join(' ')}
      >
        {prefix ? <span className="inline-flex shrink-0 items-center gap-3">{prefix}</span> : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            'min-w-0 flex-1 border-none bg-transparent outline-none',
            // 16px: below that, iOS zooms the page on focus.
            'text-[16px] leading-normal text-text-body placeholder:text-text-muted',
            numeric ? 'font-num tabular-nums' : 'font-ui',
          ].join(' ')}
          {...rest}
        />
      </div>

      {error ? (
        <span id={errorId} role="alert" className="px-1 text-ui text-[var(--error)]">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/** The +84 a Vietnamese mobile number is typed after. */
export function PhoneField(props: Omit<FieldProps, 'prefix' | 'numeric'>) {
  return (
    <Field
      {...props}
      numeric
      inputMode="tel"
      autoComplete="tel"
      prefix={
        <>
          <span className="font-num text-[16px] font-medium tabular-nums text-text-muted">+84</span>
          <span aria-hidden="true" className="h-[22px] w-px bg-[rgba(38,31,24,0.14)]" />
        </>
      }
    />
  )
}

/** Marks the way this browser got in last time — the shortcut a returning owner wants. */
export function LastUsedBadge() {
  return (
    <span className="rounded-pill bg-[var(--blush)] px-2 py-0.5 text-[11.5px] font-medium text-text-accent">
      Lần trước
    </span>
  )
}
