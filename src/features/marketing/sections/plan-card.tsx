import Link from 'next/link'
import { Pattern, buttonClassName } from '@/design-system'
import type { Plan } from '@/data/pricing'
import { PlanPrice } from './plan-price'

const CARD = 'relative flex flex-col rounded-lg px-6 py-7'

/*
 * Three grounds, one per kind of plan: the trial is a dashed outline with no
 * fill ("not yet"), the featured plan is the one terracotta card in the row,
 * and the rest sit on paper with a hairline.
 */
function groundFor(plan: Plan): string {
  if (plan.featured) return 'isolate bg-action-primary text-text-on-accent [--icon-accent:currentColor]'
  if (!plan.price) return 'border border-dashed border-border-dashed bg-transparent'
  return 'bg-surface-page shadow-[inset_0_0_0_1px_var(--border-hairline)]'
}

/**
 * One plan. A server component: only its price changes with the billing period,
 * and that is the `PlanPrice` leaf. Every card is one column with the call to
 * action pushed to the bottom (`mt-auto`), so the four cards end level however
 * many features each lists.
 */
export function PlanCard({ plan, revealOrder }: { plan: Plan; revealOrder: number }) {
  const onFill = plan.featured === true
  // On the fill, secondary text is the card's cream a shade lighter, not the muted ink.
  const soft = onFill ? 'opacity-86' : 'text-text-muted'

  return (
    <div data-reveal={String(revealOrder)} className={`${CARD} ${groundFor(plan)}`}>
      {/* Clipped to the card's radius on its own layer, so the badge can still overhang the edge. */}
      {onFill ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-1 overflow-clip rounded-[inherit]">
          <Pattern name="arcs" />
        </span>
      ) : null}
      {/* Straddles the top edge, half out and half in, so the name keeps every other card's baseline. */}
      {plan.badge ? (
        <span className="absolute top-0 right-5 -translate-y-1/2 rounded-pill bg-text-accent px-3.5 py-1.5 text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow whitespace-nowrap text-text-on-accent uppercase shadow-[0_4px_14px_color-mix(in_srgb,var(--text-heading)_18%,transparent)]">
          {plan.badge}
        </span>
      ) : null}

      <h3 className="m-0 mb-1 font-display text-subheading leading-(--leading-body) font-semibold tracking-normal text-inherit">
        {plan.name}
      </h3>
      <div className={`text-ui leading-(--leading-body) ${soft}`}>{plan.blurb}</div>

      {plan.price ? (
        <PlanPrice price={plan.price} note={plan.note} onFill={onFill} />
      ) : (
        <>
          <div className="mt-[22px] mb-1 font-num text-[34px] leading-[1.2] font-medium tabular-nums text-text-heading">
            {plan.freeLabel}
          </div>
          <div className="min-h-[18px] text-ui leading-(--leading-body) text-text-muted">{plan.freeNote}</div>
        </>
      )}

      <span
        className={`my-5 block h-px ${onFill ? 'bg-[color-mix(in_srgb,var(--text-on-accent)_25%,transparent)]' : 'bg-border-hairline'}`}
      />

      <ul
        className={`flex flex-col gap-2.5 text-body-sm leading-(--leading-body) ${onFill ? 'opacity-94' : 'text-text-muted'}`}
      >
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className={`mt-2 size-[5px] flex-none rounded-[50%] ${onFill ? 'bg-[color-mix(in_srgb,var(--text-on-accent)_70%,transparent)]' : 'bg-text-eyebrow'}`}
            />
            {feature}
          </li>
        ))}
      </ul>

      {/* Every plan starts the same way: an account, then the plan is picked inside. */}
      <div className="mt-auto pt-6">
        <Link href="/dang-ky" className={buttonClassName({ variant: onFill ? 'inverse' : 'secondary', fullWidth: true })}>
          {plan.cta}
        </Link>
      </div>
    </div>
  )
}
