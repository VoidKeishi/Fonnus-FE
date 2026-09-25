'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/design-system'
import { formatPhone, isValidPhone, normalizePhone, stashPhone } from '@/api'

/*
 * Prefix, field and action in one pill: one control instead of four.
 *
 * The one client leaf of the hero. Its `order` and top margin at ≤900px place
 * it in the hero's re-ordered single column (hero.tsx); below 560px the pill
 * cannot hold field and button on one line, so the button wraps to its own row.
 */
export function SignUpForm() {
  const router = useRouter()
  const [phone, setPhone] = useState('')

  /*
   * Taking the number here removes a whole screen from the sign-up path: it is
   * handed over and sign-up opens straight on the SMS code. Submitting empty is
   * fine — that just opens sign-up at its first step.
   */
  function startSignUp() {
    if (isValidPhone(phone)) stashPhone(phone)
    router.push('/dang-ky')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startSignUp()
      }}
      className={[
        'mt-10 box-border flex w-[min(528px,100%)] items-center gap-2.5 rounded-pill bg-surface-card py-[7px] pr-[7px] pl-[22px]',
        'shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--text-heading)_14%,transparent),0_10px_28px_color-mix(in_srgb,var(--text-heading)_7%,transparent)]',
        'focus-within:shadow-[inset_0_0_0_2px_var(--focus-ring),0_10px_28px_color-mix(in_srgb,var(--text-heading)_7%,transparent)]',
        'transition-shadow duration-[var(--duration-fast)] ease-out',
        '[@media(max-width:900px)]:order-4 [@media(max-width:900px)]:mt-[30px]',
        '[@media(max-width:560px)]:flex-wrap [@media(max-width:560px)]:rounded-[28px] [@media(max-width:560px)]:p-3',
      ].join(' ')}
    >
      <span className="flex-none font-num text-body font-medium tabular-nums text-text-muted [@media(max-width:560px)]:pl-2.5">
        +84
      </span>
      <span
        aria-hidden="true"
        className="h-[22px] w-px flex-none bg-[color-mix(in_srgb,var(--text-heading)_14%,transparent)]"
      />
      {/* Raw field, not the design-system Input: that one draws its own
          bordered box, and here the pill IS the box. */}
      <input
        aria-label="Số điện thoại của bạn"
        placeholder="90 123 45 67"
        value={formatPhone(phone)}
        onChange={(e) => {
          setPhone(normalizePhone(e.target.value).slice(0, 10))
        }}
        inputMode="tel"
        autoComplete="tel"
        className={[
          'min-w-0 flex-auto border-none bg-transparent font-num text-body tabular-nums text-text-body outline-none',
          'placeholder:text-text-muted',
          // Keeps prefix + divider + field on the first row, the button on the second.
          '[@media(max-width:560px)]:flex-[1_1_120px]',
        ].join(' ')}
      />
      <Button
        type="submit"
        size="md"
        className="flex-none [@media(max-width:560px)]:w-full [@media(max-width:560px)]:flex-[1_1_100%]"
      >
        Dùng thử miễn phí
      </Button>
    </form>
  )
}
