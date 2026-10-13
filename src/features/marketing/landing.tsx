import { Hero } from './hero/hero'
import { JsonLd } from './json-ld'
import { VoiceOrb } from './orb/voice-orb'
import { ScrollReveal } from './scroll-reveal'
import { Band } from './sections/band'
import { Capabilities } from './sections/capabilities'
import { Contact } from './sections/contact'
import { Faq } from './sections/faq'
import { HowItWorks } from './sections/how-it-works'
import { MissedCalls } from './sections/missed-calls'
import { Pricing } from './sections/pricing'
import { Security } from './sections/security'
import { Testimonials } from './sections/testimonials'
import { faqPageJsonLd, productJsonLd } from './structured-data'

/**
 * The landing page: its sections in page order, the prototype's `App.tsx`
 * order. A server component, so every section's copy is in the first HTML a
 * crawler reads. The Product and FAQPage blocks restate the plans, the
 * testimonials and the FAQ this page shows, so they live here and nowhere else.
 *
 * The voice orb comes last and outside every section: it is one element that
 * flies between the hero's dock, the corner and the call screen, and staying
 * mounted is what lets it do that without restarting its animation.
 */
export function LandingPage() {
  return (
    <>
      <JsonLd data={productJsonLd()} />
      <JsonLd data={faqPageJsonLd()} />
      <main>
        <Hero />
        <MissedCalls />
        <HowItWorks />
        <Capabilities />
        <Band />
        <Pricing />
        <Faq />
        <Security />
        <Testimonials />
        <Contact />
      </main>
      <ScrollReveal />
      <VoiceOrb />
    </>
  )
}
