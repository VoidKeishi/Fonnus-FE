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
export const LANDING_SECTION_IDS: readonly string[] = ['hero', 'vi-sao', 'cach-hoat-dong', 'bang-gia']

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Sản phẩm',
    items: [
      { label: 'Nghe thử Linh', desc: 'Gọi thử ngay trên trình duyệt', icon: 'answered', href: '/#hero', demo: true },
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
    items: [{ label: 'Vì sao Fonnus', desc: 'Cuộc gọi nhỡ đang lấy đi bao nhiêu', icon: 'missed', href: '/#vi-sao' }],
  },
]

export const FOOTER_PAGE_LINKS: { href: string; label: string }[] = [
  { href: '/#hero', label: 'Nghe thử' },
  { href: '/#cach-hoat-dong', label: 'Cách hoạt động' },
  { href: '/#bang-gia', label: 'Bảng giá' },
]

export const CONTACT = {
  phone: '+84 914 378 064',
  phoneHref: 'tel:+84914378064',
  email: 'xinchao@fonnus.ai',
  emailHref: 'mailto:xinchao@fonnus.ai',
  site: 'fonnus.ai',
}
