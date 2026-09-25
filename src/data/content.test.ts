import { describe, expect, it } from 'vitest'
import { FOOTER_PAGE_LINKS, LANDING_SECTION_IDS, NAV_GROUPS } from './content'

/*
 * The landing page is built one section at a time, and a visitor must never
 * meet a link to a section that has not landed yet. This is the gate: it
 * passes while the navigation is empty and fails the moment an entry points
 * at a section, or a page, that does not exist.
 */

/** Routes a marketing link may point at besides an in-page section. Extend with the page's own pull request. */
const KNOWN_ROUTES = ['/', '/dang-nhap', '/dang-ky']

const SECTION_ANCHOR = /^\/#(.+)$/

function isLive(href: string, sectionIds: readonly string[] = LANDING_SECTION_IDS): boolean {
  const anchor = SECTION_ANCHOR.exec(href)
  if (anchor) return sectionIds.includes(anchor[1]!)
  return KNOWN_ROUTES.includes(href)
}

const allHrefs = [
  ...NAV_GROUPS.flatMap((group) => [
    ...(group.href === undefined ? [] : [group.href]),
    ...(group.items ?? []).map((item) => item.href),
  ]),
  ...FOOTER_PAGE_LINKS.map((link) => link.href),
]

describe('the link check itself', () => {
  it('accepts an in-page anchor to a section that exists, and a known page', () => {
    expect(isLive('/#bang-gia', ['bang-gia'])).toBe(true)
    expect(isLive('/dang-ky', [])).toBe(true)
  })

  it('rejects a section that has not landed, a bare hash, and an unknown page', () => {
    expect(isLive('/#khong-co', ['bang-gia'])).toBe(false)
    // The prototype wrote `#bang-gia`, which breaks on any page but `/`.
    expect(isLive('#bang-gia', ['bang-gia'])).toBe(false)
    expect(isLive('/khong-co', [])).toBe(false)
  })
})

describe('marketing links', () => {
  it('lead only to a section that exists or to a known page', () => {
    expect(allHrefs.filter((href) => !isLive(href))).toEqual([])
  })

  it('never list the same section twice', () => {
    expect(new Set(LANDING_SECTION_IDS).size).toBe(LANDING_SECTION_IDS.length)
  })
})
