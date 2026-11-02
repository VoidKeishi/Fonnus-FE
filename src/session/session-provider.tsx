'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { api, isCanceled, setUnauthorizedHandler } from '@/api'
import type { ApiError, Me } from '@/api'
import {
  clearSessionHint,
  readSessionHint,
  serverSessionHint,
  subscribeSessionHint,
  writeSessionHint,
} from './session'

/*
 * Who is signed in, for the whole app.
 *
 * Three states, not a boolean. "We don't know yet" is a real answer, and the
 * one a synchronous `isSignedIn()` cannot express — which is the first thing a
 * real network breaks.
 *
 * Mounted in the root layout so the state survives the move from `/dang-nhap`
 * to `/app`. The probe runs only on a route where a session matters (ADR 0011
 * point 4): live, every probe is a `POST /auth/refresh`, a database write the
 * landing page has no reason to cause. There is no middleware doing this
 * instead: in mock mode the session lives in localStorage and no cookie exists
 * for a middleware to read (ADR 0003).
 */

export type SessionStatus = 'checking' | 'authenticated' | 'anonymous'

interface SessionState {
  status: SessionStatus
  me: Me | null
  /**
   * Set when the probe failed for a reason *other* than 401 — the server is
   * unreachable, which is not the same as being signed out. A screen uses this
   * to offer a retry instead of bouncing a signed-in owner to sign-in.
   */
  error: ApiError | null
  /** True if this browser completed a sign-in recently. Only picks a placeholder. */
  hint: boolean
  signIn: (me: Me) => void
  signOut: () => Promise<void>
  recheck: () => void
}

const SessionContext = createContext<SessionState | null>(null)

/** The signed-in app and the two doors into it. Everywhere else is marketing. */
function isSessionRoute(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/') || pathname === '/dang-nhap' || pathname === '/dang-ky'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  // A boolean, not the pathname: moving between two `/app` pages must not probe again.
  const onSessionRoute = isSessionRoute(usePathname())
  const [status, setStatus] = useState<SessionStatus>('checking')
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [nonce, setNonce] = useState(0)

  // Coming back onto a session route, what the last probe said is stale: it is
  // "not known yet" again until the probe below answers. Adjusted during render,
  // not in the effect, so no frame shows the stale answer.
  const [wasOnSessionRoute, setWasOnSessionRoute] = useState(onSessionRoute)
  if (wasOnSessionRoute !== onSessionRoute) {
    setWasOnSessionRoute(onSessionRoute)
    if (onSessionRoute) {
      setStatus('checking')
      setError(null)
    }
  }

  // The hint lives in localStorage, which the server cannot read: the server
  // snapshot is `false` and the store re-reads after hydration, so the two
  // renders agree and no effect has to copy the value into state.
  const hint = useSyncExternalStore(subscribeSessionHint, readSessionHint, serverSessionHint)

  useEffect(() => {
    // Off a session route nobody asks: no request, and the hint is left as it
    // is for the next visit to `/app`.
    if (!onSessionRoute) return

    // StrictMode double-invokes this in development. Without the abort, two
    // probes race and the loser's setState looks like a flicker bug of ours.
    const ac = new AbortController()

    api.auth
      .me({ signal: ac.signal })
      .then((found) => {
        if (ac.signal.aborted) return
        setError(null)
        if (found) {
          setMe(found)
          setStatus('authenticated')
          writeSessionHint()
        } else {
          setMe(null)
          setStatus('anonymous')
          clearSessionHint()
        }
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted || isCanceled(e)) return
        // Unreachable is not signed-out: keep the hint so a retry can still land
        // the owner back in the app rather than at a sign-in screen.
        setError(e as ApiError)
        setMe(null)
        setStatus('anonymous')
      })

    return () => {
      ac.abort()
    }
  }, [nonce, onSessionRoute])

  const signIn = useCallback((next: Me) => {
    setMe(next)
    setStatus('authenticated')
    setError(null)
    writeSessionHint()
  }, [])

  const forget = useCallback(() => {
    setMe(null)
    setStatus('anonymous')
    clearSessionHint()
  }, [])

  const signOut = useCallback(async () => {
    forget()
    try {
      await api.auth.logout()
    } catch {
      // Already gone server-side, or unreachable. Either way the local session
      // is cleared and the owner is out; there is nothing to tell them.
    }
    router.push('/dang-nhap')
  }, [forget, router])

  const recheck = useCallback(() => {
    setStatus('checking')
    setNonce((n) => n + 1)
  }, [])

  // A 401 that one refresh could not cure means the session is over: the
  // refresh cookie expired or was revoked (`http.ts`). Registered here rather than imported by `http`, so the transport layer never
  // depends on React.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      forget()
      router.push('/dang-nhap')
    })
    return () => {
      setUnauthorizedHandler(null)
    }
  }, [forget, router])

  // Off a session route the answer is "anonymous" without asking (ADR 0011 point 4).
  const value = useMemo(
    () =>
      onSessionRoute
        ? { status, me, error, hint, signIn, signOut, recheck }
        : { status: 'anonymous' as const, me: null, error: null, hint, signIn, signOut, recheck },
    [onSessionRoute, status, me, error, hint, signIn, signOut, recheck],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
