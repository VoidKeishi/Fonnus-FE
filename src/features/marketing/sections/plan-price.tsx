'use client'

import type { Plan } from '@/data/pricing'
import { useBillingPeriod } from './billing-period'

interface PlanPriceProps {
  price: NonNullable<Plan['price']>
  note: Plan['note']
  /** On the featured card's terracotta fill, where text inherits the card's cream. */
  onFill: boolean
}

/*
 * Keyed by the billing period, so flipping it remounts the price and its note
 * and the one entrance keyframe plays again. `motion-safe:` leaves them still
 * under reduced motion.
 */
const PRICE_IN = 'motion-safe:animate-[fnPriceIn_360ms_var(--ease-arc)]'

/** A paid plan's price and the caption under it, for the chosen billing period. */
export function PlanPrice({ price, note, onFill }: PlanPriceProps) {
  const { annual } = useBillingPeriod()
  const period = annual ? 'annual' : 'monthly'
  const soft = onFill ? 'opacity-86' : 'text-text-muted'

  return (
    <>
      <div key={`price-${period}`} className={`mt-[22px] mb-1 flex items-baseline gap-1.5 ${PRICE_IN}`}>
        <span
          className={`font-num text-[34px] leading-[1.2] font-medium tabular-nums ${onFill ? '' : 'text-text-heading'}`}
        >
          {price[period]}
        </span>
        <span className={`text-body-sm leading-(--leading-body) ${soft}`}>đ/tháng</span>
      </div>
      <div key={`note-${period}`} className={`min-h-[18px] text-ui leading-(--leading-body) ${soft} ${PRICE_IN}`}>
        {note?.[period]}
      </div>
    </>
  )
}
