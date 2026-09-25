'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** How much of a scene has to be on screen before it plays: the prototype's figure. */
const SEEN_AT = 0.45

/*
 * `settled` is the finished scene, and it is what the server renders: without
 * JavaScript, under reduced motion, without IntersectionObserver, and for a
 * scene the reader could already see when the page came up. `waiting` holds a
 * scene still below the fold at its start state; `played` runs it, once.
 */
type Stage = 'settled' | 'waiting' | 'played'

interface PlayWhenSeenProps {
  className: string
  children: ReactNode
}

/**
 * Plays the scene inside it once, the first time it is meaningfully on screen,
 * and leaves it finished for good — a card scrolled back past does not replay
 * and pull the eye a second time. The scene is server markup handed in as
 * `children`; its elements animate off `data-waiting` / `data-played` on this
 * wrapper (the `in-data-*` classes in how-it-works-visuals.tsx).
 *
 * The hidden start state is only ever entered for a scene off screen, so
 * nothing the reader is looking at vanishes and plays back in — the same check
 * the scroll reveal makes (use-reveal.ts). The observer's first report, which
 * `observe()` always delivers, is what says where the scene is.
 */
export function PlayWhenSeen({ className, children }: PlayWhenSeenProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Stage>('settled')

  useEffect(() => {
    const scene = ref.current
    if (!scene || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let firstReport = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (firstReport) {
          firstReport = false
          if (entry.isIntersecting) {
            observer.disconnect()
          } else {
            setStage('waiting')
          }
          return
        }
        // Not `isIntersecting`: that turns true the moment the first pixel
        // enters, and the observer reports that crossing too.
        if (entry.intersectionRatio < SEEN_AT) return
        setStage('played')
        observer.disconnect()
      },
      { threshold: SEEN_AT },
    )
    observer.observe(scene)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      data-waiting={stage === 'waiting' || undefined}
      data-played={stage === 'played' || undefined}
      className={className}
    >
      {children}
    </div>
  )
}
