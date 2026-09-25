import type { ReactNode } from 'react'
import { Footer } from '@/features/marketing/footer'
import { Header } from '@/features/marketing/header'

/*
 * The frame every marketing page wears. A server component: the header is the
 * one client leaf, and the pages inside stay server-rendered for the crawler.
 *
 * `overflow-x-clip`, never `hidden`: hidden would make this the scroll
 * container and break the sticky card stack in "Cách hoạt động".
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-surface-page">
      <Header />
      {children}
      <Footer />
    </div>
  )
}
