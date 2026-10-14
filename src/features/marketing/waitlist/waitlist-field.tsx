'use client'

import { useId, useRef } from 'react'
import type { InputHTMLAttributes, MouseEvent, ReactNode } from 'react'

/**
 * The waitlist's pill field: the sign-in door's pill (`features/auth/field.tsx`),
 * rebuilt here because features never import each other.
 *
 * Focus thickens the existing ring rather than adding a second one, so the
 * control never grows on focus and nothing below it shifts. The pill is the
 * field: a press anywhere on it, the "+84" included, lands in the input.
 */
export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string
  error?: string | undefined
  /** Tabular figures — for phone numbers, never for names. */
  numeric?: boolean
  /** Sits inside the pill, before the input. */
  prefix?: ReactNode
}

export function Field({ label, error, numeric = false, prefix, id, ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  const inputRef = useRef<HTMLInputElement | null>(null)

  function focusInput(e: MouseEvent<HTMLDivElement>) {
    if (e.target === inputRef.current) return
    // Keeps the press from taking focus away before it is handed to the input.
    e.preventDefault()
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-ui font-medium text-text-body">
        {label}
      </label>

      <div
        onMouseDown={focusInput}
        className={[
          'flex h-14 cursor-text items-center gap-3 rounded-pill bg-surface-card px-[22px]',
          'transition-shadow duration-[var(--duration-fast)] ease-out',
          error
            ? 'shadow-[inset_0_0_0_1.5px_var(--error)] focus-within:shadow-[inset_0_0_0_2px_var(--error)]'
            : 'shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--text-heading)_14%,transparent)] focus-within:shadow-[inset_0_0_0_2px_var(--focus-ring)]',
        ].join(' ')}
      >
        {prefix ? <span className="inline-flex shrink-0 items-center gap-3">{prefix}</span> : null}
        <input
          ref={inputRef}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            'min-w-0 flex-1 self-stretch border-none bg-transparent outline-none',
            // 16px: below that, iOS zooms the page on focus.
            'text-[16px] leading-normal text-text-body placeholder:text-text-muted',
            numeric ? 'font-num tabular-nums' : 'font-ui',
          ].join(' ')}
          {...rest}
        />
      </div>

      {error ? (
        <span
          id={errorId}
          role="alert"
          className="px-1 text-ui text-error motion-safe:animate-[fnRise_320ms_var(--ease-arc)_both]"
        >
          {error}
        </span>
      ) : null}
    </div>
  )
}

/** The +84 a number is typed after: a mobile, a fixed line or a hotline. */
export function PhoneField(props: Omit<FieldProps, 'prefix' | 'numeric'>) {
  return (
    <Field
      {...props}
      numeric
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      prefix={
        <>
          <span className="font-num text-[16px] font-medium tabular-nums text-text-muted">+84</span>
          <span aria-hidden="true" className="h-[22px] w-px bg-[color-mix(in_srgb,var(--text-heading)_14%,transparent)]" />
        </>
      }
    />
  )
}
