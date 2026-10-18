'use client'

import { useEffect, useRef } from 'react'
import { CallOverlay } from './call-overlay'
import { useCallDemo } from './call-demo-provider'
import type { DotField } from './dot-field'
import { Orb } from './orb'
import { useOrbPlacement } from './use-orb-placement'

/**
 * The landing page's one voice orb, and the call screen it opens. Rendered once
 * by `landing.tsx`, after every section and outside all of them, so it can fly
 * between the hero, the corner and the call without being re-mounted.
 *
 * The call screen's dotted field is the overlay's canvas but the orb's loop's
 * to move, so the overlay hands it over through `dotFieldRef`.
 */
export function VoiceOrb() {
  const demo = useCallDemo()
  const placement = useOrbPlacement(demo.open)
  const { closeCall, openCall } = demo
  const dotFieldRef = useRef<DotField | null>(null)

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
      {demo.open ? (
        <CallOverlay spotRef={placement.spotRef} orbRef={placement.orbRef} dotFieldRef={dotFieldRef} />
      ) : null}
      <Orb
        orbRef={placement.orbRef}
        mode={placement.mode}
        speaking={demo.agent === 'speaking'}
        getAmplitude={demo.getAmplitude}
        dotFieldRef={dotFieldRef}
        // Opened from the orb, focus comes back to the orb: no opener to hand over.
        onClick={() => {
          openCall()
        }}
      />
    </>
  )
}
