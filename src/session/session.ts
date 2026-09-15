/**
 * The session *hint* — not the session.
 *
 * The real session is an httpOnly cookie the browser holds and this app cannot
 * read. `GET /me` is the only way to know whether it is still valid, and that is
 * a round trip. This flag records "a sign-in completed in this browser recently"
 * so the app shell can render its frame while the probe is still in flight,
 * instead of flashing the sign-in screen at an owner who is perfectly signed in.
 *
 * It is deliberately not a credential and grants nothing: a stale `true` here
 * costs one skeleton frame before the probe answers 401 and redirects. Never
 * gate anything real on it.
 *
 * Every read is guarded on `typeof window` as well as wrapped: this module is
 * reachable from a component that Next.js also renders on the server, where
 * there is no storage and the honest answer is "no hint".
 */

const HINT_KEY = 'fonnus.session.hint'

/*
 * The hint is external state — it lives in the browser, not in React — so it is
 * read through `useSyncExternalStore` rather than copied into state by an
 * effect. That is what keeps the server render (`false`, always) and the first
 * client render honest without a second render to correct it.
 */
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeSessionHint(listener: Listener): () => void {
  listeners.add(listener)
  // Another tab signing in or out writes the same key; `storage` fires here.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === HINT_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

/** The server has no storage, and the honest answer there is "no hint". */
export function serverSessionHint(): boolean {
  return false
}

export function readSessionHint(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(HINT_KEY) === '1'
  } catch {
    // Private mode: no hint, so a reload shows the sign-in screen a beat sooner.
    return false
  }
}

export function writeSessionHint(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HINT_KEY, '1')
  } catch {
    /* ignore */
  }
  notify()
}

export function clearSessionHint(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(HINT_KEY)
  } catch {
    /* ignore */
  }
  notify()
}
