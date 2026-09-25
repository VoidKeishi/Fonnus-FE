/**
 * Copy for the marketing pages. Strings only, no markup, so a sentence is fixed
 * in one place and every file here can be read by a server component.
 *
 * The navigation starts empty and grows one section at a time: an entry lands
 * in the same change as the section it points at, never before. The rule is
 * pinned by `content.test.ts` — every in-page link must name an id listed in
 * `LANDING_SECTION_IDS`, which is the list of sections that exist.
 */
import type { IconName } from '@/design-system'

export interface NavItem {
  label: string
  desc: string
  icon: IconName
  /** Where the item leads; for the demo item, where the demo is on a page without it. */
  href: string
  /** Opens the "Nghe thử" call on the landing page instead of navigating. */
  demo?: true
}

export interface NavGroup {
  label: string
  /** A plain link when there are no items. */
  href?: string
  items?: NavItem[]
}

/**
 * The ids of the landing page's sections that exist. A section's pull request
 * appends its id here in the same change that adds its nav or footer entry.
 * In-page links are written `/#<id>` so they work from every marketing page.
 */
export const LANDING_SECTION_IDS: readonly string[] = [
  'hero',
  'vi-sao',
  'cach-hoat-dong',
  'kha-nang',
  'bang-gia',
  'faq',
  'bao-mat',
  'phong-kham',
]

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Sản phẩm',
    items: [
      { label: 'Nghe thử Linh', desc: 'Gọi thử ngay trên trình duyệt', icon: 'answered', href: '/#hero', demo: true },
      { label: 'Khả năng', desc: 'Đặt lịch, báo giá, chuyển máy', icon: 'appointment', href: '/#kha-nang' },
      {
        label: 'Cách hoạt động',
        desc: 'Giữ nguyên số phòng khám đang dùng',
        icon: 'settings',
        href: '/#cach-hoat-dong',
      },
    ],
  },
  { label: 'Bảng giá', href: '/#bang-gia' },
  {
    label: 'Tin cậy',
    items: [
      { label: 'Vì sao Fonnus', desc: 'Cuộc gọi nhỡ đang lấy đi bao nhiêu', icon: 'missed', href: '/#vi-sao' },
      {
        label: 'Bảo mật & dữ liệu',
        desc: 'Dữ liệu bệnh nhân lưu tại Việt Nam',
        icon: 'privacy',
        href: '/#bao-mat',
      },
      { label: 'Câu hỏi thường gặp', desc: 'Những điều chủ phòng khám hay hỏi', icon: 'list', href: '/#faq' },
    ],
  },
]

export const FOOTER_PAGE_LINKS: { href: string; label: string }[] = [
  { href: '/#hero', label: 'Nghe thử' },
  { href: '/#cach-hoat-dong', label: 'Cách hoạt động' },
  { href: '/#bang-gia', label: 'Bảng giá' },
  { href: '/#bao-mat', label: 'Bảo mật & dữ liệu' },
]

export interface FaqItem {
  q: string
  a: string
}

/** "Câu hỏi thường gặp". The question doubles as the list key, so no two may match. */
export const FAQS: readonly FaqItem[] = [
  {
    q: 'Fonnus có thay lễ tân của tôi không?',
    a: 'Không. Fonnus nhận những cuộc gọi mà hiện tại không ai nghe: ngoài giờ, lúc máy đang bận, lúc lễ tân đang đứng với bệnh nhân. Việc cần con người vẫn do con người làm.',
  },
  {
    q: 'Người gọi có biết mình đang nói với AI không?',
    a: 'Có, ngay câu đầu tiên: “Em là Fonnus, trợ lý AI của phòng khám.” Đây là yêu cầu pháp luật và phòng khám không tắt được.',
  },
  {
    q: 'Tôi có phải đổi số điện thoại không?',
    a: 'Không. Bạn giữ nguyên số khách đã quen. Nhà mạng chuyển những cuộc gọi không ai nghe sang Fonnus, chúng tôi làm cùng bạn bước này.',
  },
  {
    q: 'Nếu Fonnus không biết câu trả lời?',
    a: 'Fonnus nói là chưa có thông tin, ghi lại câu hỏi kèm số điện thoại để bạn gọi lại, hoặc nối máy cho nhân viên ngay nếu bạn bật chuyển máy.',
  },
  {
    q: 'Cài đặt mất bao lâu?',
    a: 'Phần khai thông tin phòng khám — bảng giá, giờ, dịch vụ, cách xưng hô — thường mất một đến hai buổi. Chúng tôi không cho số máy chạy thật khi thông tin còn thiếu.',
  },
  {
    q: 'Cuộc gọi được tính tiền thế nào?',
    a: 'Theo giây, tối thiểu 30 giây cho mỗi cuộc gọi được nghe. Cuộc gọi nhỡ hoặc lỗi không tính tiền. Vượt số phút của gói thì tính theo giá vượt phút của gói đó.',
  },
]

export interface Testimonial {
  quote: string
  attribution: string
}

/** "Phòng khám đang dùng". The attribution doubles as the list key, so no two may match. */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      '“Tối nào cũng có người gọi sau chín giờ. Trước đây mình đành để kệ máy reo, giờ sáng ra mở Fonnus là thấy đã có ba lịch hẹn.”',
    attribution: 'Chủ phòng khám nha khoa · Quận 7, TP.HCM',
  },
  {
    quote:
      '“Lễ tân của mình bớt phải trả lời câu hỏi giờ mở cửa cả ngày. Cô ấy ở lại với bệnh nhân đang ngồi trước mặt.”',
    attribution: 'Chủ phòng khám thẩm mỹ · Cầu Giấy, Hà Nội',
  },
  {
    quote: '“Cái mình cần là biết ai đã gọi. Bản ghi và tóm tắt mỗi tối giải quyết đúng chuyện đó.”',
    attribution: 'Chủ hai cơ sở nha khoa · Hải Châu, Đà Nẵng',
  },
]

export const CONTACT = {
  phone: '+84 914 378 064',
  phoneHref: 'tel:+84914378064',
  email: 'xinchao@fonnus.ai',
  emailHref: 'mailto:xinchao@fonnus.ai',
  site: 'fonnus.ai',
}
