import type { Metadata } from 'next'
import { LegalNoticePage } from '@/features/marketing/legal/legal-notice-page'

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'Chính sách bảo mật của Fonnus đang được hoàn thiện và sẽ được đăng tại trang này.',
  // Kept out of search results until the real text replaces the notice.
  robots: { index: false, follow: true },
}

export default function Page() {
  return <LegalNoticePage doc="privacy" />
}
