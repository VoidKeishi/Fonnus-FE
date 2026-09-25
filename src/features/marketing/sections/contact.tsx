import { Icon } from '@/design-system'
import { CONTACT } from '@/data/content'
import { ContactForm } from './contact-form'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, TEXT_LINK } from './section-chrome'

const POINTS = [
  'Chúng tôi làm cùng bạn phần chuyển hướng cuộc gọi',
  'Dùng thử 14 ngày trước khi trả tiền',
  'Không ràng buộc hợp đồng dài hạn',
]

/**
 * "Liên hệ": the slower door, for owners who want a person before they want an
 * account — chains and hospitals on a quoted plan, and anyone who would rather
 * be walked through call forwarding than press "Dùng thử miễn phí".
 *
 * A server component; the form on the right is its one client leaf.
 */
export function Contact() {
  return (
    <section id="lien-he" className={`${SECTION_BAND} bg-surface-card`}>
      <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-[clamp(32px,6vw,80px)]">
        <div data-reveal="0" data-reveal-from="left">
          <div className={SECTION_EYEBROW}>Liên hệ</div>
          <h2 className={`${SECTION_HEADING} mb-6 max-w-[22ch]`}>Cần tư vấn trước khi bắt đầu?</h2>
          <p className="m-0 mb-8 max-w-[48ch] text-body-lg text-text-muted">
            Để lại số điện thoại, chúng tôi gọi lại trong 24 giờ — xem phòng khám bạn cần gì và cài đặt cùng bạn.
            Chuỗi phòng khám và bệnh viện cũng liên hệ ở đây để nhận báo giá riêng.
          </p>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-body-sm leading-(--leading-body) text-text-body">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-2.5">
                <span className="inline-flex h-[1.6em] flex-none items-center font-semibold text-text-accent">
                  <Icon name="check" size={16} />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-8 pt-8 text-body-sm leading-(--leading-body) shadow-[inset_0_1px_0_var(--border-hairline)]">
            <div>
              <div className="mb-1 text-text-muted">Điện thoại · Zalo</div>
              <a href={CONTACT.phoneHref} className={`${TEXT_LINK} font-num tabular-nums`}>
                {CONTACT.phone}
              </a>
            </div>
            <div>
              <div className="mb-1 text-text-muted">Email</div>
              <a href={CONTACT.emailHref} className={TEXT_LINK}>
                {CONTACT.email}
              </a>
            </div>
          </div>
        </div>

        <div
          data-reveal="1"
          data-reveal-from="right"
          className="rounded-lg bg-surface-page p-[clamp(24px,3vw,36px)]"
        >
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
