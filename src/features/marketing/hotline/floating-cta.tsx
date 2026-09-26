'use client'

import { useEffect, useState } from 'react'
import { buttonClassName } from '@/design-system'

interface FloatingCtaProps {
  /** The head's own call to action: once it has scrolled away, this one waits at the bottom edge. */
  ctaId: string
  /** The form section: once it is reached, this one leaves. */
  formId: string
}

/**
 * On a phone the case runs to three screens before the form. Once the head's
 * own button has scrolled away, the same button waits at the bottom edge — and
 * leaves the moment the form is reached, where it would only repeat the submit
 * button under the visitor's thumb.
 *
 * The observer runs at every width; the stylesheet keeps the button to screens
 * under 900px, where the head's button and the form are more than a short
 * scroll apart. Hidden, it is inert: out of the tab order and the reading order.
 */
export function FloatingCta({ ctaId, formId }: FloatingCtaProps) {
  const shown = useFloatingCta(ctaId, formId)

  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      data-shown={shown ? '' : undefined}
      className={[
        // Same side inset as the header's rail, so its edges sit under the pill's.
        'pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden justify-center px-[clamp(20px,5vw,64px)] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))] max-[900px]:flex',
        'translate-y-[calc(100%+8px)] opacity-0 data-[shown]:translate-y-0 data-[shown]:opacity-100',
        '[transition:translate_var(--duration-slow)_var(--ease-arc),opacity_var(--duration-base)_var(--ease-out)] motion-reduce:transition-none',
      ].join(' ')}
    >
      <div className="w-[min(520px,100%)] rounded-pill shadow-overlay [[data-shown]>&]:pointer-events-auto">
        <a href={`#${formId}`} tabIndex={shown ? undefined : -1} className={buttonClassName({ size: 'lg', fullWidth: true })}>
          Nhận báo cáo miễn phí
        </a>
      </div>
    </div>
  )
}

/** One observer over the two targets, disconnected on unmount. */
function useFloatingCta(ctaId: string, formId: string): boolean {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const cta = document.getElementById(ctaId)
    const form = document.getElementById(formId)
    if (!cta || !form || !('IntersectionObserver' in window)) return

    let passed = false
    let reached = false
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === cta) passed = !entry.isIntersecting && entry.boundingClientRect.top < 0
        if (entry.target === form) reached = entry.isIntersecting || entry.boundingClientRect.top < 0
      }
      setShown(passed && !reached)
    })
    observer.observe(cta)
    observer.observe(form)
    return () => {
      observer.disconnect()
    }
  }, [ctaId, formId])

  return shown
}
