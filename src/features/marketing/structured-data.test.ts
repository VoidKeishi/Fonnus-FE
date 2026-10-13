import { describe, expect, it } from 'vitest'
import { CONTACT, FAQS } from '@/data/content'
import { PLANS } from '@/data/pricing'
import { SITE_URL } from '@/data/site'
import {
  faqPageJsonLd,
  organizationJsonLd,
  productJsonLd,
  serializeJsonLd,
  vndToNumber,
  webSiteJsonLd,
} from './structured-data'

/*
 * No suite renders a page, and nobody reads these blocks in a browser — but an
 * agent quotes them verbatim and Google judges them against the page. A change
 * to the shape of a plan or a testimonial must fail here, not ship as a NaN
 * price or a rating the page never showed.
 */

describe('vndToNumber', () => {
  it('reads every plan price the way the page writes it', () => {
    for (const plan of PLANS) {
      if (!plan.price) continue
      for (const display of [plan.price.monthly, plan.price.annual]) {
        const amount = vndToNumber(display)
        expect(Number.isInteger(amount)).toBe(true)
        expect(amount).toBeGreaterThan(0)
        expect(String(amount)).toHaveLength(display.replaceAll('.', '').length)
      }
    }
  })

  it('refuses anything that is not digits grouped by dots', () => {
    for (const display of ['4,275,000', '4.275.000 đ', '', 'abc']) {
      expect(() => vndToNumber(display)).toThrow()
    }
  })
})

describe('productJsonLd', () => {
  const product = productJsonLd()

  it('offers each paid plan monthly and yearly, and the free trial once, all in VND', () => {
    expect(product.offers).toHaveLength(7)
    for (const offer of product.offers) {
      expect(Number.isFinite(offer.price)).toBe(true)
      expect(offer.price).toBeGreaterThanOrEqual(0)
      expect(offer.priceCurrency).toBe('VND')
    }
    expect(product.offers.filter((offer) => offer.price === 0)).toHaveLength(1)
  })

  it('describes each offer with the plan blurb and the caption its card shows, in plan order', () => {
    const expected = PLANS.flatMap((plan) =>
      plan.price
        ? [`${plan.blurb} — ${plan.note?.monthly ?? ''}`, `${plan.blurb} — ${plan.note?.annual ?? ''}`]
        : [`${plan.blurb} — ${plan.freeLabel ?? ''}, ${plan.freeNote ?? ''}`],
    )
    expect(product.offers.map((offer) => offer.description)).toEqual(expected)
    for (const description of expected) expect(description.endsWith(' — ')).toBe(false)
  })

  it('states no review and no rating, since the page shows no rating to take them from', () => {
    const json = JSON.stringify(product)
    expect(json).not.toContain('"review"')
    expect(json).not.toContain('Review')
    expect(json).not.toContain('aggregateRating')
    expect(json).not.toContain('reviewRating')
  })

  it('points its image and the logo at the production site', () => {
    expect(product.image.startsWith(SITE_URL)).toBe(true)
    expect(organizationJsonLd().logo.startsWith(SITE_URL)).toBe(true)
  })
})

describe('faqPageJsonLd', () => {
  it('asks and answers every question of the FAQ word for word', () => {
    const { mainEntity } = faqPageJsonLd()
    expect(mainEntity).toHaveLength(FAQS.length)
    mainEntity.forEach((question, index) => {
      expect(question.name).toBe(FAQS[index]?.q)
      expect(question.acceptedAnswer.text).toBe(FAQS[index]?.a)
    })
  })
})

describe('organizationJsonLd', () => {
  const organization = organizationJsonLd()

  it('gives the phone number in international form, taken from the contact link', () => {
    expect(organization.telephone).toBe('+84914378064')
    expect(organization.email).toBe(CONTACT.email)
  })

  it('is the publisher the WebSite block names', () => {
    expect(organization['@id'].endsWith('#organization')).toBe(true)
    expect(webSiteJsonLd().publisher['@id']).toBe(organization['@id'])
  })
})

describe('serializeJsonLd', () => {
  it('escapes every < so a value cannot close the script tag, and still parses back', () => {
    const data = { '@context': 'https://schema.org', '@type': 'Answer', text: 'Gõ </script> vào ô' } as const
    const json = serializeJsonLd(data)
    expect(json).toContain('\\u003c/script>')
    expect(json).not.toContain('</script>')
    expect(JSON.parse(json)).toEqual(data)
  })
})
