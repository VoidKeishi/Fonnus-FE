import Link from 'next/link'
import { Pattern, buttonClassName } from '@/design-system'
import { PLANS } from '@/data/pricing'
import { BillingPeriodProvider } from './billing-period'
import { BillingSwitch } from './billing-switch'
import { ComparisonMatrix } from './comparison-matrix'
import { PlanCard } from './plan-card'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, SECTION_INNER } from './section-chrome'

/**
 * "Bảng giá": the four plans, a monthly/annual switch, the enterprise bar that
 * sends a chain or a hospital to "Liên hệ", and the full comparison
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

        {/* "Doanh nghiệp": the plan with no price, one line across the page. A
            night island, so `data-theme="dark"` resolves every alias inside it
            and turns the dots' accent to the night terracotta. */}
        <div
          data-reveal="0"
          data-theme="dark"
          className="relative isolate mt-(--gap-card) flex flex-wrap items-center justify-between gap-5 overflow-clip rounded-lg bg-surface-inverse p-7 text-text-on-inverse"
        >
          <Pattern name="night-dots" style={{ zIndex: -1 }} />
          <div className="min-w-[220px] flex-1">
            <div className="mb-2 font-display text-subheading leading-(--leading-body) font-semibold">Doanh nghiệp</div>
            <p className="m-0 text-body-sm text-[color-mix(in_srgb,var(--text-on-inverse)_72%,transparent)]">
              Chuỗi phòng khám và bệnh viện, nhiều cơ sở, nhiều cuộc gọi cùng lúc — báo giá riêng.
            </p>
          </div>
          <Link href="/#lien-he" className={`${buttonClassName({ variant: 'inverse' })} flex-none`}>
            Liên hệ báo giá
          </Link>
        </div>

        <ComparisonMatrix />
      </div>
    </section>
  )
}
