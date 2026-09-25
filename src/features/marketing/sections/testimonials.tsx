import { Shape } from '@/design-system'
import { TESTIMONIALS } from '@/data/content'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, SECTION_INNER } from './section-chrome'

/**
 * "Phòng khám đang dùng": three owners in their own words. A server component;
 * the shape beside the heading gives way to the heading alone below 900px.
 */
export function Testimonials() {
  return (
    <section id="phong-kham" className={SECTION_BAND}>
      <div className={SECTION_INNER}>
        <div className="mb-12 flex items-end justify-between gap-8">
          <div>
            <div data-reveal="0" className={SECTION_EYEBROW}>
              Phòng khám đang dùng
            </div>
            <h2 data-reveal="1" className={`${SECTION_HEADING} max-w-[24ch]`}>
              Mười phòng khám đầu tiên
            </h2>
          </div>
          {/* "Chủ phòng khám nhẹ người": the person below, the call held above. */}
          <div data-reveal="1" className="-mb-2.5 flex-none text-text-heading max-[901px]:hidden">
            <Shape name="relieved-owner" size={150} />
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-(--gap-card)">
          {TESTIMONIALS.map((item, i) => (
            <div
              key={item.attribution}
              data-reveal={String(i)}
              className="flex flex-col gap-[18px] rounded-lg bg-surface-card p-6"
            >
              <p className="m-0 text-body text-text-body">{item.quote}</p>
              <div className="mt-auto text-ui leading-(--leading-body) text-text-muted">{item.attribution}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
