import { Hero } from './hero/hero'

/**
 * The landing page: its sections in page order, the prototype's `App.tsx`
 * order. A server component, so every section's copy is in the first HTML a
 * crawler reads.
 */
export function LandingPage() {
  return (
    <main>
      <Hero />
    </main>
  )
}
