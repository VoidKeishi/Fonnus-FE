import type { ReactNode } from 'react'
import Link from 'next/link'
import { Icon, Logo } from '@/design-system'
import { AUTH_FOOTNOTE, CONTACT } from '@/data/auth'

/**
 * The frame every auth screen sits in: one column of form, with a reassurance
 * panel beside it on a wide screen and nothing but the form on a phone.
 *
 * There is no step indicator. Position in the flow is carried by the heading
 * and by `back` — a three-step flow that announces it is three steps only
 * advertises its own length, and the first thing an owner should see is the
 * field.
 *
 * The form column is first in the DOM as well as on screen, so it is also first
 * for the keyboard.
 */

export interface AuthBack {
  label: string
  /** A real href where the destination is a route; `onClick` where it is a step. */
  href?: string
  onClick?: () => void
}

interface AuthShellProps {
  /** Top left. Defaults to the way out; `null` where there is nowhere to go back to. */
  back?: AuthBack | null
  /** Top right — the other door. Omitted mid-flow, where it is a distraction. */
  swap?: ReactNode
  /** The panel beside the form. Reassurance, never a control. */
  panel?: ReactNode
  children: ReactNode
}

const HOME: AuthBack = { label: 'Trang chủ', href: '/' }

export function AuthShell({ back = HOME, swap, panel, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface-page lg:grid-cols-[minmax(0,1fr)_clamp(420px,43%,620px)]">
      <div className="flex min-w-0 flex-col px-5 pt-5 pb-6 sm:px-[clamp(24px,5vw,64px)] sm:pt-7 sm:pb-[26px]">
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {back ? <BackLink back={back} /> : <span />}
          {/* Two slots, one shown at a time: beside the back link on a wide
              screen, under the form on a phone, where the bar has no room. */}
          {swap ? <span className="hidden text-ui text-text-muted lg:inline">{swap}</span> : null}
        </div>

        <div className="flex flex-1 items-start justify-center pt-5 pb-7 lg:items-center lg:pt-3 lg:pb-5">
          <div className="flex w-full max-w-[460px] flex-col gap-[26px] lg:gap-[30px]">
            {/* The panel carries the logo on a wide screen; below that it is gone. */}
            <Link href="/" aria-label="Về trang chủ Fonnus" className="-mb-1.5 self-start lg:hidden">
              <Logo variant="horizontal" height={28} />
            </Link>
            {children}
            {swap ? <span className="self-center pt-0.5 text-center text-ui text-text-muted lg:hidden">{swap}</span> : null}
          </div>
        </div>

        <p className="m-0 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[12.5px] leading-normal text-text-muted">
          <span>{AUTH_FOOTNOTE.residency}</span>
          <span aria-hidden="true" className="hidden opacity-50 xl:inline">
            ·
          </span>
          <span className="whitespace-nowrap">
            {AUTH_FOOTNOTE.supportLabel}{' '}
            <a href={CONTACT.phoneHref} className="font-num font-medium tabular-nums">
              {CONTACT.phone}
            </a>{' '}
            <span>({AUTH_FOOTNOTE.supportNote})</span>
          </span>
        </p>
      </div>

      {/*
        Below the large breakpoint the panel goes: it is reassurance, not a
        control, and the form should have the screen to itself.
      */}
      <aside className="relative hidden flex-col justify-between gap-8 overflow-hidden bg-surface-warm px-14 pt-11 pb-12 shadow-[inset_1px_0_0_var(--border-hairline)] lg:flex">
        {panel}
      </aside>
    </div>
  )
}

function BackLink({ back }: { back: AuthBack }) {
  const inner = (
    <>
      {/* One arrow glyph in the set; this is the one place it points back. */}
      <Icon name="arrow-right" size={15} className="rotate-180" />
      {back.label}
    </>
  )

  const className =
    'inline-flex cursor-pointer items-center gap-[5px] border-none bg-transparent p-0 font-ui text-ui font-medium text-text-muted no-underline transition-colors duration-[120ms] ease-out hover:text-text-body'

  return back.onClick ? (
    <button type="button" className={className} onClick={back.onClick}>
      {inner}
    </button>
  ) : (
    <Link href={back.href ?? '/'} className={className}>
      {inner}
    </Link>
  )
}

/** Title, plus the one line that says what happens next. */
export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-display text-[28px] leading-[1.25] font-semibold tracking-display text-text-heading sm:text-[30px] lg:text-[36px]">
        {title}
      </h1>
      {children ? <p className="m-0 text-[14.5px] leading-relaxed text-text-muted sm:text-[15px]">{children}</p> : null}
    </div>
  )
}
