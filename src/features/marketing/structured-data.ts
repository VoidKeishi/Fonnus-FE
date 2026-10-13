import { CONTACT, FAQS } from '@/data/content'
import { PLANS, type Plan } from '@/data/pricing'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/data/site'

/*
 * The schema.org blocks the marketing pages carry, for an agent or a search
 * engine that wants facts rather than prose: who Fonnus is, what each plan
 * costs, what the FAQ answers. Google's policy is that structured data must be
 * a true representation of the page, so every value is one the pages already
 * show, read from `src/data/`; the only words written here are schema.org's
 * own names.
 *
 * No `review` and no rating, although the page shows three testimonials:
 * Google's review rules require a `reviewRating` on each review and an
 * `aggregateRating` once there is more than one, and the page shows no rating
 * to take either from. Reviews return with the testimonials row in
 * `PLAN.md` §Backlog, when real clinics and a visible rating exist.
 */

export type JsonLd = { '@context': 'https://schema.org'; '@type': string } & Record<string, unknown>

const CONTEXT = 'https://schema.org'
/*
 * A JSON-LD node identifier, not a page: the WebSite's `publisher` and the
 * Product's `brand` point at this `@id` so a parser reads one Organization on
 * the page, not three copies. The spec wants an IRI, and the site's own origin
 * keeps it globally unique; the fragment never reaches the server, so nothing
 * has to answer at this address.
 */
const ORGANIZATION_ID = `${SITE_URL}/#organization`
const PRICING_URL = `${SITE_URL}/#bang-gia`

type BillingPeriod = keyof NonNullable<Plan['price']>
const BILLING_PERIODS: readonly BillingPeriod[] = ['monthly', 'annual']

/**
 * A price as the page writes it (`4.275.000`) as the number schema.org wants.
 * Anything but digits grouped by dots throws: the landing page is prerendered,
 * so a malformed price fails the build instead of shipping as NaN.
 */
export function vndToNumber(display: string): number {
  if (!/^\d{1,3}(\.\d{3})*$/.test(display)) {
    throw new Error(`Not a Vietnamese-formatted VND amount: "${display}"`)
  }
  return Number(display.replaceAll('.', ''))
}

/** JSON for a `<script>` body: every `<` escaped, so no string in it can close the tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** The plan's blurb, then the caption the card shows under its price, as one sentence. */
function offerDescription(blurb: string, captions: readonly (string | undefined)[]): string {
  const caption = captions.filter(Boolean).join(', ')
  return caption ? `${blurb} — ${caption}` : blurb
}

/** One offer per billing period the switch shows; the free trial is one offer at zero. */
function planOffers(plan: Plan) {
  const offer = { '@type': 'Offer', name: plan.name, priceCurrency: 'VND', url: PRICING_URL }
  const { price } = plan
  if (!price) {
    return [
      {
        ...offer,
        price: 0,
        description: offerDescription(plan.blurb, [plan.freeLabel, plan.freeNote]),
      },
    ]
  }
  return BILLING_PERIODS.map((period) => ({
    ...offer,
    price: vndToNumber(price[period]),
    description: offerDescription(plan.blurb, [plan.note?.[period]]),
  }))
}

export function organizationJsonLd() {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/fonnus-mark.svg`,
    description: SITE_DESCRIPTION,
    email: CONTACT.email,
    telephone: CONTACT.phoneHref.replace(/^tel:/, ''),
  } satisfies JsonLd
}

export function webSiteJsonLd() {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'vi',
    publisher: { '@id': ORGANIZATION_ID },
  } satisfies JsonLd
}

export function productJsonLd() {
  return {
    '@context': CONTEXT,
    '@type': 'Product',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/fonnus-og.png`,
    brand: { '@id': ORGANIZATION_ID },
    offers: PLANS.flatMap(planOffers),
  } satisfies JsonLd
}

export function faqPageJsonLd() {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  } satisfies JsonLd
}
