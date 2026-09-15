'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export const OTP_LENGTH = 6

interface OtpFieldProps {
  value: string
  onChange: (value: string) => void
  /** Fired once the sixth digit lands — the code confirms itself, no button. */
  onComplete: (value: string) => void
  error?: string | null
  disabled?: boolean
  autoFocus?: boolean
}

/**
 * One real input under six painted boxes: SMS autofill, paste and mobile
 * keyboards all keep working, and there is no six-way focus dance to manage.
 */
export function OtpField({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
}: OtpFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const completed = useRef(false)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Auto-submit on the sixth digit, but only once per code — otherwise a
  // re-render while verifying would fire it again.
  useEffect(() => {
    if (value.length === OTP_LENGTH && !completed.current) {
      completed.current = true
      onComplete(value)
    }
    if (value.length < OTP_LENGTH) completed.current = false
  }, [value, onComplete])

  const digits = value.padEnd(OTP_LENGTH, ' ').split('').slice(0, OTP_LENGTH)
  const cursor = Math.min(value.length, OTP_LENGTH - 1)

  return (
    <div>
      <div className="relative">
        <div className="pointer-events-none flex gap-1.5 sm:gap-2.5">
          {digits.map((digit, i) => {
            const active = !error && i === cursor && !disabled
            return (
              <span
                key={i}
                className={[
                  'relative inline-flex h-[58px] w-12 items-center justify-center sm:h-16 sm:w-14',
                  'rounded-lg font-num text-[24px] font-semibold tabular-nums text-text-body sm:text-[26px]',
                  'transition-shadow duration-[120ms] ease-out',
                  error
                    ? 'bg-surface-rose shadow-[inset_0_0_0_1.5px_var(--error)]'
                    : active
                      ? 'bg-surface-card shadow-[inset_0_0_0_2px_var(--terracotta)]'
                      : 'bg-surface-card shadow-[inset_0_0_0_1.5px_var(--border-strong)]',
                ].join(' ')}
              >
                {digit.trim()}
                {/* The real caret is hidden with the input, so the active box draws its own. */}
                {active && !digit.trim() ? (
                  <span
                    aria-hidden="true"
                    className="h-[26px] w-[1.5px] rounded-[1px] bg-[var(--terracotta)] motion-safe:animate-[fnCaret_1.1s_steps(1,end)_infinite]"
                  />
                ) : null}
              </span>
            )
          })}
        </div>

        <input
          ref={inputRef}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          aria-label="Mã xác nhận 6 số"
          aria-invalid={!!error}
          /* Invisible but still focusable, and never `display: none`: iOS skips
             autofill on a hidden field. 16px because anything smaller makes iOS
             zoom the page on focus. */
          className="absolute inset-0 h-full w-full cursor-pointer border-none bg-transparent text-[16px] text-transparent caret-transparent opacity-0 outline-none"
        />
      </div>

      {error ? (
        <span role="alert" className="mt-2.5 block text-ui text-[var(--error)]">
          {error}
        </span>
      ) : null}
    </div>
  )
}

interface ResendProps {
  /** Seconds left before the resend link unlocks. */
  secondsLeft: number
  onResend: () => void
  /** Extra line for email codes, e.g. where to look when it has not arrived. */
  note?: ReactNode
}

/** Under the boxes: when the code can be sent again, and nothing else. */
export function OtpFooter({ secondsLeft, onResend, note }: ResendProps) {
  const mm = Math.floor(secondsLeft / 60)
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="mt-0.5 flex flex-col items-start gap-2.5 text-ui font-medium">
      {secondsLeft > 0 ? (
        <span className="text-text-muted">
          Gửi lại mã sau{' '}
          <span className="font-num font-semibold tabular-nums text-text-body">
            {mm}:{ss}
          </span>
        </span>
      ) : (
        <button
          type="button"
          onClick={onResend}
          className="cursor-pointer border-none bg-transparent p-0 font-ui font-medium text-text-link hover:underline"
        >
          Gửi lại mã
        </button>
      )}

      {note ? <span className="text-text-muted">{note}</span> : null}
    </div>
  )
}
