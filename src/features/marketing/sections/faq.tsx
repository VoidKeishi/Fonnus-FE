import { FAQS } from '@/data/content'
import { FaqList } from './faq-list'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING } from './section-chrome'

/**
 * "Câu hỏi thường gặp": the doubts an owner checks before trusting Fonnus with
 * her phone. A server component in a narrower 900px column; which answer is
 * open is its only client state, and every answer is in the server's HTML.
 */
export function Faq() {
  return (
    <section id="faq" className={SECTION_BAND}>
      <div className="mx-auto max-w-[900px]">
        <div data-reveal="0" className={SECTION_EYEBROW}>
          Câu hỏi thường gặp
        </div>
        <h2 data-reveal="1" className={`${SECTION_HEADING} mb-12`}>
          Những điều chủ phòng khám hỏi trước
        </h2>

        <FaqList items={FAQS} />
      </div>
    </section>
  )
}
