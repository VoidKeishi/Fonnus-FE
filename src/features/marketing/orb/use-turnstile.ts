import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { TURNSTILE_SITE_KEY } from '@/api'
import type { Challenger } from './turnstile'

/*
 * The call screen's Turnstile widget (ADR 0009 point 5), as the `challenge`
 * `api.voice.connect` asks for. Cloudflare's script loads and the widget is
 * rendered when the call screen opens, beside the budget read, so the tap
 * only has to run the challenge (ADR 0009 point 5). `turnstile.ts`
 * is imported here, not at the top, so neither it nor Cloudflare's address
 * ships with the page.
 */

/**
 * `open`: the call screen is open and `container` is mounted in it. Closing
 * it, or unmounting, removes the widget. Without a site key there is no
 * widget, and `challenge` rejects at once: the call fails closed, as the
 * route would have it anyway.
 */
export function useTurnstile(
  open: boolean,
  container: RefObject<HTMLElement | null>,
): (signal: AbortSignal) => Promise<string> {
  const challenger = useRef<Promise<Challenger> | null>(null)

  useEffect(() => {
    const element = container.current
    if (!open || !element || !TURNSTILE_SITE_KEY) return
    let closed = false
    const ready = import('./turnstile').then((turnstile) => {
      if (closed) throw new Error('Turnstile: the call screen closed')
      // Loads the script and renders the widget at once; a failure is tried again by the tap.
      return turnstile.createChallenger(element, TURNSTILE_SITE_KEY)
    })
    // Its rejection is the tap's to report; here it is only kept from being unhandled.
    void ready.catch(() => undefined)
    challenger.current = ready
    return () => {
      closed = true
      if (challenger.current === ready) challenger.current = null
      void ready.then(
        (created) => {
          created.dispose()
        },
        () => undefined,
      )
    }
  }, [open, container])

  return useCallback(async (signal: AbortSignal) => {
    const ready = challenger.current
    if (!ready) throw new Error('Turnstile: no widget')
    return (await ready).take(signal)
  }, [])
}
