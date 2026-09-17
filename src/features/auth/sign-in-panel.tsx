import Link from 'next/link'
import { Fragment } from 'react'
import { Icon, Logo } from '@/design-system'
import { SIGNIN_PANEL } from '@/data/auth'

/**
 * The panel beside the sign-in form: last night's calls, already answered.
 *
 * Reassurance, not a control — `AuthShell` drops it entirely below the large
 * breakpoint, so nothing here may be the only way to do anything. A server
 * component: it is fixed copy and has no state.
 */
export function SignInPanel() {
  return (
    <>
      <Link href="/" aria-label="Về trang chủ Fonnus" className="inline-flex shrink-0 self-start">
        <Logo variant="horizontal" height={30} />
      </Link>

      {/* The brand's rising arc, once, staggered down the scene. Delays are
          written inline because they are composition, not style. */}
      <div className="flex w-full flex-col gap-[18px]">
        <div className="flex justify-center motion-safe:animate-[fnRise_var(--duration-arc)_var(--ease-arc)_both]">
          <span className="inline-flex items-center gap-2 rounded-pill bg-[var(--milk)] px-3.5 py-[7px] text-[13px] leading-snug font-medium whitespace-nowrap text-text-body shadow-[inset_0_0_0_1px_var(--border-hairline)]">
            <Icon name={SIGNIN_PANEL.when.icon} size={15} className="text-[var(--terracotta)]" />
            <Num>{SIGNIN_PANEL.when.time}</Num>
            {SIGNIN_PANEL.when.context.map((item) => (
              <Fragment key={item}>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span>{item}</span>
              </Fragment>
            ))}
          </span>
        </div>

        <div
          className="flex flex-col rounded-xl bg-[var(--milk)] px-6 pt-[22px] pb-2 motion-safe:animate-[fnRise_var(--duration-arc)_var(--ease-arc)_both]"
          style={{ animationDelay: '140ms' }}
        >
          <div className="flex items-baseline justify-between gap-3 pb-3.5">
            <span className="text-eyebrow font-semibold tracking-eyebrow uppercase text-text-eyebrow">
              {SIGNIN_PANEL.logLabel}
            </span>
            <span className="font-display text-[22px] leading-tight font-semibold text-text-heading">
              <Num>{SIGNIN_PANEL.logCount.num}</Num> {SIGNIN_PANEL.logCount.label}
            </span>
          </div>

          {SIGNIN_PANEL.calls.map((call) => (
            <div key={call.number} className="flex items-center gap-3.5 border-t border-border-hairline py-[13px]">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--blush)] text-[var(--terracotta-deep)]"
              >
                <Icon name="incoming" size={16} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Num className="text-body-sm text-text-heading">{call.number}</Num>
                <span className="text-[12.5px] text-text-muted">{call.meta}</span>
              </span>
              <span
                className={[
                  'rounded-pill px-2.5 py-1 text-[12.5px] font-medium whitespace-nowrap',
                  call.booked
                    ? 'bg-[rgba(184,92,43,0.12)] text-text-accent'
                    : 'bg-[rgba(38,31,24,0.06)] text-text-muted',
                ].join(' ')}
              >
                {call.outcome}
              </span>
            </div>
          ))}
        </div>

        <div
          className="flex gap-2.5 motion-safe:animate-[fnRise_var(--duration-arc)_var(--ease-arc)_both]"
          style={{ animationDelay: '280ms' }}
        >
          {SIGNIN_PANEL.tiles.map((tile) => (
            <div
              key={tile.label}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg bg-[var(--milk)] px-[18px] py-3.5 text-[13.5px] leading-snug text-text-body"
            >
              <Icon name={tile.icon} size={18} className="text-[var(--terracotta-deep)]" />
              <span>
                <Num className="font-semibold">{tile.num}</Num> {tile.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex max-w-[440px] flex-col gap-3">
        {/* base.css sets an explicit colour on h1–h4, so the panel states its
            own rather than inheriting from the panel ground. */}
        <h2 className="m-0 font-display text-[30px] leading-tight font-semibold tracking-display text-text-heading xl:text-[34px]">
          {SIGNIN_PANEL.headline}
        </h2>
        <p className="m-0 text-[14.5px] leading-[1.7] text-text-muted">{SIGNIN_PANEL.lede}</p>
      </div>
    </>
  )
}

/** Figures in the number face, aligned in a column. */
function Num({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <b className={`font-num font-semibold tabular-nums ${className}`}>{children}</b>
}
