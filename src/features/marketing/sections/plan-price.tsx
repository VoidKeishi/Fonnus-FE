import type { Plan } from '@/data/pricing'

interface PlanPriceProps {
  price: NonNullable<Plan['price']>
  note: Plan['note']
  /** On the featured card's terracotta fill, where text inherits the card's cream. */
  onFill: boolean
}

/*
 * Both periods are in the server HTML, so a crawler that runs no JavaScript
 * still reads the annual total. `BillingPeriodProvider` writes the chosen
 * period on a `group` ancestor as `data-billing`, and the other block is
 * `display: none` — out of the accessibility tree too, so a screen reader
 * hears one label. A block coming back from `display: none` restarts its
 * animation, which is what replays the entrance on every flip.
 */
const PERIODS = [
  { period: 'monthly', label: 'Trả tháng:', hiddenWhen: 'group-data-[billing=annual]:hidden' },
  { period: 'annual', label: 'Trả năm:', hiddenWhen: 'group-data-[billing=monthly]:hidden' },
] as const

const PRICE_IN = 'motion-safe:animate-[fnPriceIn_360ms_var(--ease-arc)]'

/** A paid plan's price and the caption under it, one block per billing period. */
export function PlanPrice({ price, note, onFill }: PlanPriceProps) {
  const soft = onFill ? 'opacity-86' : 'text-text-muted'

  return (
    <>
      {PERIODS.map(({ period, label, hiddenWhen }) => (
        <div key={period} className={`${hiddenWhen} ${PRICE_IN}`}>
          <span className="sr-only">{label}</span>
          <div className="mt-[22px] mb-1 flex items-baseline gap-1.5">
            <span
              className={`font-num text-[34px] leading-[1.2] font-medium tabular-nums ${onFill ? '' : 'text-text-heading'}`}
            >
              {price[period]}
            </span>
            <span className={`text-body-sm leading-(--leading-body) ${soft}`}>đ/tháng</span>
          </div>
          <div className={`min-h-[18px] text-ui leading-(--leading-body) ${soft}`}>{note?.[period]}</div>
        </div>
      ))}
    </>
  )
}
