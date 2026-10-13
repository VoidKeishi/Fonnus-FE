import { describe, expect, it } from 'vitest'
import { CONTACT, FAQS, LEGAL_PAGES, NAV_GROUPS } from '@/data/content'
import { PLANS } from '@/data/pricing'
import { SITE_DESCRIPTION, SITE_NAME, SITE_PAGES, SITE_TAGLINE, SITE_URL } from '@/data/site'
import { renderLlmsTxt } from './llms-txt'

/*
 * No gate reads /llms.txt: the suites render no page and nobody opens the file
 * in a browser. A change to the shape of a plan or a FAQ entry — a note made
 * optional, a price renamed — would leave the file carrying "undefined" or an
 * empty clause, and an agent would quote it as the product's own words. This
 * pins what the file must carry and what it must never say.
 */
const text = renderLlmsTxt()
const lines = text.split('\n')
const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1] ?? '')

describe('/llms.txt', () => {
  it('opens with the site name as its one H1, then the tagline and description as the summary', () => {
    expect(lines[0]).toBe(`# ${SITE_NAME}`)
    expect(lines[2]).toBe(`> ${SITE_TAGLINE}. ${SITE_DESCRIPTION}`)
    expect(lines.filter((line) => line.startsWith('# '))).toHaveLength(1)
  })

  it('lists every page a crawler is sent to, with its description', () => {
    for (const page of Object.values(SITE_PAGES)) {
      expect(text).toContain(`- [${page.label}](${SITE_URL}${page.path}): ${page.description}`)
    }
  })

  it('carries every plan with its monthly price and its annual note, and the free trial as words', () => {
    for (const plan of PLANS) {
      expect(text).toContain(`- [${plan.name}](`)
      if (plan.price) {
        expect(text).toContain(`${plan.price.monthly} đ/tháng`)
        expect(text).toContain(plan.note?.monthly ?? 'a note the plan does not have')
      } else {
        expect(text).toContain(`${plan.freeLabel ?? ''}, ${plan.freeNote ?? ''}`)
      }
      for (const feature of plan.features) expect(text).toContain(feature)
    }
  })

  it('answers every question of the FAQ', () => {
    for (const faq of FAQS) expect(text).toContain(`- [${faq.q}](${SITE_URL}/#faq): ${faq.a}`)
  })

  it('gives the email and the phone number', () => {
    expect(text).toContain(`[${CONTACT.email}](${CONTACT.emailHref})`)
    expect(text).toContain(`[${CONTACT.phone}](${CONTACT.phoneHref})`)
  })

  it('never renders a missing value or an empty clause', () => {
    expect(text).not.toContain('undefined')
    expect(text).not.toContain('null')
    expect(lines.filter((line) => line.endsWith(': ') || line.endsWith(':'))).toEqual([])
    expect(text).not.toContain(' — , ')
    expect(text).not.toContain(', .')
  })

  it('links only with absolute URLs, since an agent reads the file without the page it came from', () => {
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.startsWith(`${SITE_URL}/`) || link.startsWith('mailto:') || link.startsWith('tel:')).toBe(true)
    }
  })

  it('leaves out the demo item, which opens a call an agent cannot make', () => {
    const demo = NAV_GROUPS.flatMap((group) => group.items ?? []).filter((item) => item.demo)
    expect(demo.length).toBeGreaterThan(0)
    for (const item of demo) expect(text).not.toContain(`[${item.label}]`)
  })

  it('leaves out the legal pages while their text is a placeholder', () => {
    for (const page of Object.values(LEGAL_PAGES)) expect(text).not.toContain(page.href)
  })
})
