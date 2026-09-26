import { ScrollReveal } from '../scroll-reveal'
import { FloatingCta } from './floating-cta'
import { MissedCallStats } from './missed-call-stats'
import { ReportRequest } from './report-request'

/* The form section the calls to action lead to, and the head's own button the floating copy watches. */
const FORM_ID = 'nhan-bao-cao'
const CTA_ID = 'so-lieu-cta'

/**
 * "Chấm điểm hotline" — the free mystery-shopping report, as its own page.
 *
 * Two sections and nothing else: the case (a clinic misses more calls than it
 * thinks) and the ask (where to call, where to send the report). It is a page
 * rather than a landing section because it offers a measurement, not the
 * receptionist. It wears the marketing layout's header and footer, the landing
 * page's section rhythm and its reveal, so moving between the two reads as one
 * site. It has no orb: the orb means "talk to her" and lives with the call
 * demo, so the header's "Nghe thử Linh" goes back to the hero.
 *
 * A server component; the chart, the form and the floating button are its
 * client leaves.
 */
export function HotlineReportPage() {
  return (
    <>
      <main>
        <MissedCallStats ctaId={CTA_ID} formId={FORM_ID} />
        <ReportRequest formId={FORM_ID} />
      </main>
      <ScrollReveal />
      <FloatingCta ctaId={CTA_ID} formId={FORM_ID} />
    </>
  )
}
