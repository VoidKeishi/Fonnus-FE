import { Icon, Pattern, Shape } from '@/design-system'
import type { IconName } from '@/design-system'
import { SECTION_BAND, SECTION_EYEBROW_DEEP, SECTION_HEADING, SECTION_INNER } from './section-chrome'

interface Commitment {
  title: string
  body: string
  /** The promise this section is really built around. */
  ringed?: true
  /** The pictogram above the title: an icon at shape scale, or a shape. */
  art: { icon: IconName } | { shape: 'handoff' }
}

const PROMISES: readonly Commitment[] = [
  {
    title: 'Xin phép trước khi ghi âm',
    body: 'Fonnus chia sẻ minh bạch cuộc gọi được xử lý bởi AI và được ghi âm. Người gọi đồng ý thì Fonnus mới tiếp tục.',
    art: { icon: 'voice' },
  },
  {
    title: 'Dữ liệu là của phòng khám',
    body: 'Bản ghi âm và nội dung cuộc gọi chỉ tài khoản phòng khám xem được. Bạn yêu cầu xoá, chúng tôi xoá.',
    art: { icon: 'privacy' },
  },
  {
    title: 'Chuyên môn y khoa: chuyển cho bác sĩ',
    body: 'Fonnus trả lời giá, giờ, lịch hẹn và thông tin phòng khám. Câu hỏi thuộc chuyên môn luôn được chuyển cho bác sĩ.',
    ringed: true,
    art: { shape: 'handoff' },
  },
]

/*
 * The arcs thin out towards the cards instead of stopping at a line. A mask
 * reads only alpha, so the alias is there to carry no hex, as the band's does.
 */
const ARCS_MASK =
  'linear-gradient(180deg, var(--text-heading) 0%, var(--text-heading) 28%, color-mix(in srgb, var(--text-heading) 40%, transparent) 52%, transparent 78%)'

/*
 * The clinical-handoff promise matters most here, so it is ringed rather than
 * tinted: the section is already blush, and a blush card on a blush ground
 * vanished.
 */
const CARD = 'rounded-lg bg-surface-card p-6'
const CARD_RINGED = `${CARD} shadow-[inset_0_0_0_1.5px_var(--text-eyebrow)]`

/**
 * "Bảo mật & dữ liệu": the AI disclosure, whose data it is, and where the
 * medical questions go. A server component on the landing page's blush band,
 * with the "Cung chéo" arcs behind the heading.
 */
export function Security() {
  return (
    <section id="bao-mat" className={`${SECTION_BAND} relative isolate overflow-clip bg-surface-warm`}>
      <Pattern name="arcs" style={{ zIndex: -1, maskImage: ARCS_MASK, WebkitMaskImage: ARCS_MASK }} />
      <div className={SECTION_INNER}>
        <div data-reveal="0" className={SECTION_EYEBROW_DEEP}>
          Bảo mật &amp; dữ liệu
        </div>
        <h2 data-reveal="1" className={`${SECTION_HEADING} mb-6 max-w-[26ch]`}>
          Người gọi biết mình đang nói với trợ lý AI
        </h2>
        <p data-reveal="2" className="m-0 mb-12 max-w-[62ch] text-body-lg text-text-muted">
          Câu công bố nằm trong câu đầu tiên của mỗi cuộc gọi, và phòng khám không tắt được. Đây là yêu cầu
          pháp luật, không phải tuỳ chọn.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-(--gap-card)">
          {PROMISES.map((promise, i) => (
            <div key={promise.title} data-reveal={String(i)} className={promise.ringed ? CARD_RINGED : CARD}>
              {/*
               * One pictogram per card in a fixed 64px slot, so the three titles
               * start on one line whether the card holds an icon or a shape. The
               * shape's drawing sits in the lower half of its 200 grid; the
               * negative margins put its visual centre on the icons' centre line.
               */}
              <div aria-hidden="true" className="-mt-1 mb-4 -ml-1 flex h-16 flex-none items-center text-text-heading">
                {'shape' in promise.art ? (
                  <Shape name={promise.art.shape} size={100} className="-mt-[25px] -ml-2.5 self-start" />
                ) : (
                  <Icon name={promise.art.icon} size={56} />
                )}
              </div>
              <div
                className={`mb-2.5 font-display text-subheading font-semibold ${promise.ringed ? 'text-text-accent' : ''}`}
              >
                {promise.title}
              </div>
              <p className="m-0 text-body-sm text-text-muted">{promise.body}</p>
            </div>
          ))}
        </div>

        <p data-reveal="0" className="m-0 mt-6 max-w-[74ch] text-ui leading-(--leading-body) text-text-muted">
          Cơ sở pháp lý chúng tôi làm theo: Luật 91/2025/QH15 về bảo vệ dữ liệu cá nhân và Luật 134/2025/QH15 về
          công bố nội dung do AI tạo, hiệu lực tháng 3 năm 2026.
        </p>
      </div>
    </section>
  )
}
