import { PLANS } from '@/data/pricing'
import { BillingPeriodProvider } from './billing-period'
import { BillingSwitch } from './billing-switch'
import { ComparisonMatrix } from './comparison-matrix'
import { PlanCard } from './plan-card'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, SECTION_INNER } from './section-chrome'

/**
 * "Bảng giá": the four plans, a monthly/annual switch, and the full comparison
 * behind a toggle. A server component; the billing period and the toggle are
 * its only client state.
 */
export function Pricing() {
  return (
    <section id="bang-gia" className={`${SECTION_BAND} bg-surface-card`}>
      <div className={SECTION_INNER}>
        <BillingPeriodProvider>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
            <div>
              <div data-reveal="0" className={SECTION_EYEBROW}>
                Bảng giá
              </div>
              <h2 data-reveal="1" className={`${SECTION_HEADING} max-w-[24ch]`}>
                Giá minh bạch, không ràng buộc
              </h2>
            </div>
            <div data-reveal="2" className="rounded-pill bg-surface-page px-[18px] py-2.5">
              <BillingSwitch />
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-(--gap-card)">
            {PLANS.map((plan, i) => (
              <PlanCard key={plan.name} plan={plan} revealOrder={i} />
            ))}
          </div>
        </BillingPeriodProvider>

        <ComparisonMatrix />
      </div>
    </section>
  )
}
