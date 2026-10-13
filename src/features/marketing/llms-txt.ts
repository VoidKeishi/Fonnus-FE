import { CONTACT, FAQS, NAV_GROUPS } from '@/data/content'
import { PLANS } from '@/data/pricing'
import { SITE_DESCRIPTION, SITE_NAME, SITE_PAGES, SITE_TAGLINE, SITE_URL } from '@/data/site'

/*
 * The landing page's sections the plans, the questions and the contact details
 * live in. `content.test.ts` checks the navigation's anchors against the
 * sections that exist; these three are listed there too.
 */
const PRICING_ANCHOR = '/#bang-gia'
const FAQ_ANCHOR = '/#faq'

/** A list entry in the shape the proposal asks for: a link, then a colon and a note. */
function entry(label: string, href: string, note?: string): string {
  const url = href.startsWith('/') ? `${SITE_URL}${href}` : href
  return note ? `- [${label}](${url}): ${note}` : `- [${label}](${url})`
}

/** The free plan shows a word where the others show a price; both read as one clause here. */
function planNote(plan: (typeof PLANS)[number]): string {
  const price = plan.price
    ? `${plan.price.monthly} đ/tháng, ${plan.note?.monthly ?? ''}`
    : `${plan.freeLabel ?? ''}, ${plan.freeNote ?? ''}`
  return `${plan.blurb} — ${price}. ${plan.features.join(' · ')}`
}

/**
 * The text of `/llms.txt`, in the shape proposed at llmstxt.org: an H1, a
 * blockquote summary, prose, then H2 sections of links with notes. An agent
 * reads it while answering a visitor, so it is in the visitor's language and
 * every sentence is one the pages already show — the summary is the site's
 * title and description, the sections are the navigation, the plans, the FAQ
 * and the contact details, straight from `src/data/`. Nothing is written here
 * that is not on a page; the one English line tells an agent reading on behalf
 * of an English speaker what it has found. The legal pages are left out while
 * they are placeholders, as they are left out of the sitemap.
 */
export function renderLlmsTxt(): string {
  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    '',
    `${SITE_NAME} is an AI voice receptionist for clinics in Vietnam. The site, and the rest of this file, are in Vietnamese.`,
    '',
    '## Trang',
    '',
    ...Object.values(SITE_PAGES).map((page) => entry(page.label, page.path, page.description)),
  ]

  // The demo item opens a call in the browser, which an agent cannot do.
  for (const group of NAV_GROUPS) {
    if (!group.items) continue
    lines.push('', `## ${group.label}`, '')
    for (const item of group.items) {
      if (item.demo) continue
      lines.push(entry(item.label, item.href, item.desc))
    }
  }

  lines.push('', '## Bảng giá', '')
  for (const plan of PLANS) lines.push(entry(plan.name, PRICING_ANCHOR, planNote(plan)))

  lines.push('', '## Câu hỏi thường gặp', '')
  for (const faq of FAQS) lines.push(entry(faq.q, FAQ_ANCHOR, faq.a))

  lines.push(
    '',
    '## Liên hệ',
    '',
    entry(CONTACT.email, CONTACT.emailHref),
    entry(CONTACT.phone, CONTACT.phoneHref),
    '',
  )

  return lines.join('\n')
}
