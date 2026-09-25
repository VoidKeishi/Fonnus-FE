import type { Metadata } from 'next'
import { LandingPage } from '@/features/marketing/landing'

export const metadata: Metadata = { title: { absolute: 'Fonnus — Không cuộc gọi nào bị bỏ lỡ.' } }

export default function Page() {
  return <LandingPage />
}
