import Link from 'next/link'
import { Icon, Logo, Pattern } from '@/design-system'
import { WAITLIST_PANEL } from '@/data/waitlist'

/*
 * A mask reads only alpha, so any opaque colour would do; the alias is there so
 * the gradient carries no hex. The dots fade out down the panel.
 */
const DOTS_MASK =
  'linear-gradient(180deg, var(--text-heading) 0%, color-mix(in srgb, var(--text-heading) 60%, transparent) 50%, color-mix(in srgb, var(--text-heading) 15%, transparent) 100%)'

const ROW =
  'grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3.5 py-3 ' +
  'max-[1181px]:grid-cols-[48px_minmax(0,1fr)] max-[1181px]:gap-y-2 max-[561px]:grid-cols-[44px_minmax(0,1fr)]'

const TAG =
  'inline-flex h-7 items-center gap-1.5 rounded-pill px-3 text-[12.5px] leading-[1.2] font-semibold whitespace-nowrap ' +
  'max-[1181px]:col-start-2 max-[1181px]:justify-self-start'

/**
 * The night panel beside the waitlist form: one shift Linh worked while the
 * clinic was dark, and — once the visitor has joined — the call Fonnus will
 * make to them, as the next row of the same log.
 *
 * `data-theme="dark"` scopes the night palette to this block, as the footer
 * does: inside it the page ground is night, the text cream, and the accent
 * aliases the night terracotta and lemongrass.
 *
 * Every row's resting style is its finished state, so under reduced motion the
 * log reads complete; only `motion-safe:` animates it.
 */
export function WaitlistPanel({ joined }: { joined: { name: string } | null }) {
  return (
    <aside
      data-theme="dark"
      aria-label={WAITLIST_PANEL.logLabel}
      className={[
        'relative isolate flex min-w-0 flex-col justify-between gap-8 overflow-hidden bg-surface-page text-text-body',
        'px-14 pt-11 pb-12 max-[1181px]:px-10 max-[1181px]:pt-9 max-[1181px]:pb-10 max-[901px]:gap-7 max-[901px]:px-5',
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[200px] -right-[180px] -z-1 size-[620px] rounded-[50%] bg-[radial-gradient(circle,color-mix(in_srgb,var(--text-eyebrow)_22%,transparent)_0%,color-mix(in_srgb,var(--text-eyebrow)_6%,transparent)_45%,transparent_70%)] motion-safe:animate-[fnGlowDrift_8s_ease-in-out_infinite_alternate]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-1 overflow-hidden text-text-heading"
        style={{ maskImage: DOTS_MASK, WebkitMaskImage: DOTS_MASK }}
      >
        {/* One tile taller than the panel, so the drift never shows an edge. */}
        <Pattern
          name="night-dots"
          className="motion-safe:animate-[fnSink_7s_linear_infinite]"
          style={{ height: 'calc(100% + 22px)' }}
        />
      </div>

      <Link href="/" aria-label="Fonnus — về trang chủ" className="inline-flex self-start">
        <Logo variant="horizontal-dark" height={26} />
      </Link>

      <div className="rounded-[24px] bg-[color-mix(in_srgb,var(--surface-card)_82%,transparent)] px-2 pt-2 pb-2.5 shadow-[inset_0_0_0_1px_var(--border-hairline)] min-[901px]:max-[1181px]:p-1.5">
        <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5 text-eyebrow font-semibold tracking-[0.14em] text-text-muted uppercase">
          {/* The crescent sways; the sparkle beside it stays still. */}
          <Icon
            name="moon"
            size={18}
            className="text-text-heading [&>path:first-child]:[transform-box:fill-box] [&>path:first-child]:[transform-origin:center] motion-safe:[&>path:first-child]:animate-[fnSway_6s_ease-in-out_infinite_alternate]"
          />
          {WAITLIST_PANEL.logLabel}
        </div>

        {WAITLIST_PANEL.calls.map((call, index) => (
          <div
            key={call.time}
            className={`${ROW} motion-safe:animate-[fnRowCycle_13s_var(--ease-arc)_infinite] ${index > 0 ? 'shadow-[inset_0_1px_0_var(--border-hairline)]' : ''}`}
            style={{ animationDelay: `${String(index)}s` }}
          >
            <span className="font-num text-[15px] leading-[1.2] font-medium tabular-nums">{call.time}</span>
            <span className="min-w-0 text-[14.5px] leading-[1.4]">
              {call.what}
              <span className="block text-[12.5px] text-text-muted">{call.who}</span>
            </span>
            <span className={`${TAG} bg-[color-mix(in_srgb,var(--chart-2)_14%,transparent)] text-chart-2`}>
              <Icon name="check" size={14} />
              {call.outcome}
            </span>
          </div>
        ))}

        {joined ? (
          <div
            className={`${ROW} bg-[color-mix(in_srgb,var(--text-eyebrow)_12%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-eyebrow)_35%,transparent)] motion-safe:animate-[fnRise_600ms_var(--ease-arc)_both]`}
          >
            <span className="font-num text-[15px] leading-[1.2] font-medium tabular-nums">{WAITLIST_PANEL.mine.time}</span>
            <span className="min-w-0 text-[14.5px] leading-[1.4] break-words">
              {WAITLIST_PANEL.mine.what} {joined.name}
              <span className="block text-[12.5px] text-text-muted">{WAITLIST_PANEL.mine.note}</span>
            </span>
            <span className={`${TAG} bg-[color-mix(in_srgb,var(--text-eyebrow)_18%,transparent)] text-text-eyebrow`}>
              {WAITLIST_PANEL.mine.outcome}
            </span>
          </div>
        ) : null}
      </div>

      {/* base.css sets an explicit colour and tracking on h1–h4, so the panel states its own. */}
      <h2 className="m-0 max-w-[16ch] font-display text-[clamp(28px,2.6vw,38px)] leading-[1.2] font-semibold tracking-[-0.015em] text-balance text-text-heading">
        {WAITLIST_PANEL.headline.lead} <span className="text-text-eyebrow">{WAITLIST_PANEL.headline.accent}</span>
      </h2>
    </aside>
  )
}
