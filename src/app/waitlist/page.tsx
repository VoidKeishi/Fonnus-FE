import type { Metadata } from 'next'
import { SITE_PAGES } from '@/data/site'
import { JsonLd } from '@/features/marketing/json-ld'
import { organizationJsonLd, webSiteJsonLd } from '@/features/marketing/structured-data'
import { WaitlistPage } from '@/features/marketing/waitlist/waitlist-page'

const page = SITE_PAGES.waitlist

export const metadata: Metadata = {
  title: page.label,
  description: page.description,
  alternates: { canonical: page.path },
}

/**
 * Outside both route groups: the waitlist has neither the marketing header and
 * footer nor an auth layout. So the two site-wide JSON-LD blocks the marketing
 * layout renders are rendered here, on the server.
 */
export default function Page() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />
      <WaitlistPage />
    </>
  )
}
