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
  href: string
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
export const LANDING_SECTION_IDS: readonly string[] = []

export const NAV_GROUPS: NavGroup[] = []

export const FOOTER_PAGE_LINKS: { href: string; label: string }[] = []

export const CONTACT = {
  phone: '+84 914 378 064',
  phoneHref: 'tel:+84914378064',
  email: 'xinchao@fonnus.ai',
  emailHref: 'mailto:xinchao@fonnus.ai',
  site: 'fonnus.ai',
}
