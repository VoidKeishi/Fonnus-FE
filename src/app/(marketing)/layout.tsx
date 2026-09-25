import type { ReactNode } from 'react'
import { Footer } from '@/features/marketing/footer'
import { Header } from '@/features/marketing/header'
import { CallDemoProvider } from '@/features/marketing/orb/call-demo-provider'

/*
 * The frame every marketing page wears. A server component: the call demo's
 * provider and the header are its client leaves, and the pages inside stay
 * server-rendered for the crawler. The provider wraps the header as well as
 * the page because the header's "Nghe thử Linh" opens the same call as the orb.
 *
 * `overflow-x-clip`, never `hidden`: hidden would make this the scroll
 * container and break the sticky card stack in "Cách hoạt động". This box is
 * also the orb's containing block while it sits on the hero.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-surface-page">
      <CallDemoProvider>
        <Header />
        {children}
        <Footer />
      </CallDemoProvider>
    </div>
  )
}
