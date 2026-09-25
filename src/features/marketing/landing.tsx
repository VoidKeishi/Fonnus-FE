import { Hero } from './hero/hero'
import { VoiceOrb } from './orb/voice-orb'
import { ScrollReveal } from './scroll-reveal'
import { HowItWorks } from './sections/how-it-works'
import { MissedCalls } from './sections/missed-calls'
import { Pricing } from './sections/pricing'

/**
 * The landing page: its sections in page order, the prototype's `App.tsx`
 * order. A server component, so every section's copy is in the first HTML a
 * crawler reads.
 *
 * The voice orb comes last and outside every section: it is one element that
 * flies between the hero's dock, the corner and the call screen, and staying
 * mounted is what lets it do that without restarting its animation.
 */
export function LandingPage() {
  return (
    <>
      <main>
        <Hero />
        <MissedCalls />
        <HowItWorks />
        {/* Capabilities and Band land here, in that order. */}
        <Pricing />
      </main>
      <ScrollReveal />
      <VoiceOrb />
    </>
  )
}
