import type { Metadata } from 'next'
import { LandingPage } from '@/features/marketing/landing'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default function Page() {
  return <LandingPage />
}
