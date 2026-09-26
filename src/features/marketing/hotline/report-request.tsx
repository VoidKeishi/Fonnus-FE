import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, SECTION_INNER } from '../sections/section-chrome'
import { ReportRequestCard } from './report-form'
import { SampleReport } from './sample-report'

/*
 * Head and sample report on the left, the form on the right — the "Liên hệ"
 * section's split, so the two asks on the site look like one. Stacked below
 * 1000px in reading order: what it is, what you get, then the form.
 */
const LAYOUT = [
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] grid-rows-[auto_1fr] items-start gap-x-[clamp(32px,6vw,80px)] gap-y-8',
  "[grid-template-areas:'head_form'_'preview_form']",
  "max-[1000px]:grid-cols-[minmax(0,1fr)] max-[1000px]:grid-rows-none max-[1000px]:gap-y-7 max-[1000px]:[grid-template-areas:'head'_'preview'_'form']",
].join(' ')

/** "Để Fonnus gọi thử hotline của bạn" — the ask. A server component; the form card is its one client leaf. */
export function ReportRequest({ formId }: { formId: string }) {
  return (
    <section id={formId} className={`${SECTION_BAND} bg-surface-card`}>
      <div className={`${SECTION_INNER} ${LAYOUT}`}>
        <div data-reveal="0" className="min-w-0 [grid-area:head]">
          <div className={SECTION_EYEBROW}>Miễn phí cho phòng khám</div>
          <h2 className={`${SECTION_HEADING} mb-5 max-w-[18ch]`}>Để Fonnus gọi thử hotline của bạn</h2>
          <p className="m-0 max-w-[46ch] text-body-lg text-text-muted">
            Chúng tôi gọi tới từng cơ sở của bạn <b className="font-num font-semibold text-text-heading">5–7 lần</b> trong
            vài ngày, như một bệnh nhân thật, rồi chấm điểm từng cuộc gọi.
          </p>
        </div>

        <SampleReport />

        <ReportRequestCard />
      </div>
    </section>
  )
}
