'use client'

import { useEffect } from 'react'
import { CallOverlay } from './call-overlay'
import { useCallDemo } from './call-demo-provider'
import { Orb } from './orb'
import { useOrbPlacement } from './use-orb-placement'

/**
 * The landing page's one voice orb, and the call screen it opens. Rendered once
 * by `landing.tsx`, after every section and outside all of them, so it can fly
 * between the hero, the corner and the call without being re-mounted.
 */
export function VoiceOrb() {
  const demo = useCallDemo()
  const placement = useOrbPlacement(demo.open)
  const { closeCall, openCall } = demo

  // The call state outlives this page (it lives in the marketing layout); a
  // call left open by navigating away must not keep the next page locked.
  useEffect(
    () => () => {
      closeCall()
    },
    [closeCall],
  )

  return (
    <>
      {demo.open ? <CallOverlay spotRef={placement.spotRef} orbRef={placement.orbRef} /> : null}
      <Orb
        orbRef={placement.orbRef}
        mode={placement.mode}
        speaking={demo.agent === 'speaking'}
        getAmplitude={demo.getAmplitude}
        // Opened from the orb, focus comes back to the orb: no opener to hand over.
        onClick={() => {
          openCall()
        }}
      />
    </>
  )
}
