import type { Metadata } from 'next'
import { SITE_PAGES } from '@/data/site'
import { HotlineReportPage } from '@/features/marketing/hotline/hotline-report-page'

const page = SITE_PAGES.hotline

export const metadata: Metadata = {
  title: page.label,
  description: page.description,
  alternates: { canonical: page.path },
}

export default function Page() {
  return <HotlineReportPage />
}
