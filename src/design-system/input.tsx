'use client'

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

/*
 * The focus ring is `:focus-within` on the frame rather than React state, so
 * the prefix, the field and the suffix light up as one control — which is what
 * they look like.
 */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  prefix?: ReactNode
  suffix?: ReactNode
  /** Tabular figures in the number face — for a phone number or a code. */
  numeric?: boolean
  /** Wrapper class, not input class: the frame is what a caller usually sizes. */
  className?: string
}

export function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  numeric = false,
  id,
  className = '',
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error || hint ? `${inputId}-note` : undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="font-ui text-ui leading-(--leading-body) font-medium text-text-body">
          {label}
        </label>
      ) : null}

      <div
        className={[
          'flex items-center gap-2 rounded-md bg-surface-card px-3.5 py-[11px]',
          'transition-shadow duration-[120ms] ease-out',
          error
            ? 'shadow-[inset_0_0_0_2px_var(--error)]'
            : 'shadow-[inset_0_0_0_1px_var(--border-strong)] focus-within:shadow-[inset_0_0_0_2px_var(--focus-ring)]',
        ].join(' ')}
      >
        {prefix ? <span className="inline-flex shrink-0 text-text-muted">{prefix}</span> : null}
        {/*
          The 1px × 2px padding is the browser's default for an input, which
          the prototype never reset and Tailwind's preflight does; restated so
          a field is the prototype's 73px tall, not 71px.
        */}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            'min-w-0 flex-1 border-none bg-transparent px-0.5 py-px text-body-sm leading-normal text-text-body outline-none',
            'placeholder:text-text-muted',
            numeric ? 'font-num tabular-nums' : 'font-ui',
          ].join(' ')}
          {...rest}
        />
        {suffix ? <span className="shrink-0 font-num text-body-sm text-text-muted">{suffix}</span> : null}
      </div>

      {error ? (
        <span id={describedBy} role="alert" className="text-ui leading-(--leading-body) text-[var(--error)]">
          {error}
        </span>
      ) : hint ? (
        <span id={describedBy} className="text-ui leading-(--leading-body) text-text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  )
}
