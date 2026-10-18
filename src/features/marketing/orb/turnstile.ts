/*
 * Cloudflare Turnstile in the browser: the proof every voice demo ticket costs
 * (ADR 0009 point 5). The widget is Invisible — a mode set on the widget in
 * Cloudflare's dashboard, not here — so the visitor sees nothing of it.
 *
 * Imported dynamically by `use-turnstile.ts` when the call screen opens, never
 * with the page, and nothing here runs at import time. The script is fetched
 * from Cloudflare's exact URL, as Cloudflare requires: proxied, cached or
 * bundled, it breaks.
 */

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface RenderOptions {
  sitekey: string
  /** Rendered without running: the challenge runs on `execute`, when a tap asks for a token. */
  execution: 'execute'
  callback: (token: string) => void
  'error-callback': (code: string) => void
  'expired-callback': () => void
}

/** The part of `window.turnstile` used here, written out so no package or `@types` is needed. */
interface TurnstileApi {
  /** The widget's id, or nothing when it could not be rendered. */
  render(container: HTMLElement, options: RenderOptions): string | null | undefined
  execute(widgetId: string): void
  reset(widgetId: string): void
  remove(widgetId: string): void
  isExpired(widgetId: string): boolean
  getResponse(widgetId: string): string | undefined
}

const turnstileOf = (): TurnstileApi | undefined => (window as Window & { turnstile?: TurnstileApi }).turnstile

/** Never shown: whatever rejects here becomes `voice_unavailable` in `voice.live.ts`. */
const failure = (what: string) => new Error(`Turnstile: ${what}`)

let loading: Promise<TurnstileApi> | null = null

/**
 * Loads Cloudflare's script, once: every call shares one promise and one
 * `<script>`. A load that fails is forgotten, its tag removed, so the next tap
 * tries again rather than failing for the rest of the page's life.
 */
export function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= injectScript().catch((err: unknown) => {
    loading = null
    throw err
  })
  return loading
}

function injectScript(): Promise<TurnstileApi> {
  const ready = turnstileOf()
  if (ready) return Promise.resolve(ready)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    const settle = (outcome: TurnstileApi | Error) => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
      if (outcome instanceof Error) {
        script.remove()
        reject(outcome)
        return
      }
      resolve(outcome)
    }
    const onLoad = () => {
      settle(turnstileOf() ?? failure('the script ran without defining window.turnstile'))
    }
    const onError = () => {
      settle(failure('the script did not load'))
    }
    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
    document.head.append(script)
  })
}

/** Rejects when `signal` aborts first, and leaves no listener behind either way. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(failure('aborted'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(failure('aborted'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(err instanceof Error ? err : failure('failed'))
      },
    )
  })
}

export interface Challenger {
  /**
   * A token no earlier `take` returned: the widget's last one while it is
   * fresh and unused, otherwise a new challenge's. Rejects when the widget
   * cannot be rendered or errors before a token arrives, when `signal`
   * aborts, and once disposed.
   */
  take(signal: AbortSignal): Promise<string>
  /** Removes the widget and rejects a `take` still waiting. */
  dispose(): void
}

/**
 * One Invisible widget in `container`, rendered as soon as Cloudflare's script
 * is there — when the call screen opens, beside the budget read — so a tap
 * only has to run the challenge (ADR 0009 point 5). A render that fails is
 * tried again by the next `take`, as a script that fails to load is.
 *
 * A token is handed out once, because the route spends it: a second tap after
 * a ticket request runs the challenge again, and so does a token past its 300
 * seconds. A token that arrives with no `take` waiting — the challenge of a
 * tap abandoned mid-way — is kept for the next one.
 */
export function createChallenger(container: HTMLElement, sitekey: string): Challenger {
  let turnstile: TurnstileApi | null = null
  let widgetId: string | null = null
  let rendering: Promise<{ api: TurnstileApi; id: string }> | null = null
  /** The widget has run a challenge, so it holds an answer until it is reset. */
  let executed = false
  /** The widget's last token, until it is handed out, expires, or the widget errors. */
  let unused: string | null = null
  /** A challenge has been executed and has not called back yet. */
  let running = false
  let waiting: { resolve: (token: string) => void; reject: (err: Error) => void } | null = null
  let disposed = false

  /** A function, not an inline test: `dispose` may run while `take` awaits the script. */
  const throwIfDisposed = () => {
    if (disposed) throw failure('disposed')
  }

  const rejectWaiting = (err: Error) => {
    const pending = waiting
    waiting = null
    pending?.reject(err)
  }

  const options: RenderOptions = {
    sitekey,
    execution: 'execute',
    callback(token) {
      running = false
      const pending = waiting
      waiting = null
      if (pending) pending.resolve(token)
      else unused = token
    },
    'error-callback'(code) {
      running = false
      unused = null
      rejectWaiting(failure(`widget error ${code}`))
    },
    // Only the kept token goes: a `take` still waiting has reset the widget and
    // runs a new challenge, whose own callback settles it.
    'expired-callback'() {
      unused = null
    },
  }

  /** The widget, rendered once; a load or render that fails is forgotten, so the next call tries again. */
  const renderWidget = (): Promise<{ api: TurnstileApi; id: string }> => {
    rendering ??= loadTurnstile()
      .then((api) => {
        throwIfDisposed()
        const id = api.render(container, options) ?? null
        if (id === null) throw failure('the widget did not render')
        turnstile = api
        widgetId = id
        return { api, id }
      })
      .catch((err: unknown) => {
        rendering = null
        throw err instanceof Error ? err : failure('the widget did not render')
      })
    return rendering
  }

  // Now, not on the tap: the iframe and Cloudflare's challenge code then load
  // outside the connection budget. A failure here is the tap's to retry.
  void renderWidget().catch(() => undefined)

  /** The widget's last token, handed out now, or null when it has none fit to hand out. */
  const takeUnused = (api: TurnstileApi, id: string): string | null => {
    const token = unused
    unused = null
    if (token === null || api.isExpired(id) || api.getResponse(id) !== token) return null
    return token
  }

  return {
    async take(signal) {
      throwIfDisposed()
      const { api, id } = await untilAborted(renderWidget(), signal)
      throwIfDisposed()
      const kept = takeUnused(api, id)
      if (kept !== null) return kept

      return new Promise<string>((resolve, reject) => {
        rejectWaiting(failure('superseded'))
        const entry = {
          resolve: (token: string) => {
            signal.removeEventListener('abort', onAbort)
            resolve(token)
          },
          reject: (err: Error) => {
            signal.removeEventListener('abort', onAbort)
            reject(err)
          },
        }
        // The challenge left running may never call back; the next take starts a fresh one.
        const onAbort = () => {
          if (waiting !== entry) return
          waiting = null
          running = false
          reject(failure('aborted'))
        }
        if (signal.aborted) {
          reject(failure('aborted'))
          return
        }
        signal.addEventListener('abort', onAbort, { once: true })
        waiting = entry
        if (running) return
        running = true
        try {
          if (executed) api.reset(id)
          executed = true
          api.execute(id)
        } catch {
          // A widget Cloudflare will not run never calls back either.
          running = false
          rejectWaiting(failure('the challenge did not start'))
        }
      })
    },

    dispose() {
      if (disposed) return
      disposed = true
      rejectWaiting(failure('disposed'))
      if (turnstile && widgetId !== null) {
        try {
          turnstile.remove(widgetId)
        } catch {
          // The container left the page with the call screen; there is nothing left to remove.
        }
      }
      widgetId = null
      unused = null
    },
  }
}
