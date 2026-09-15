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
import { useRouter } from 'next/navigation'
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
 * Mounted in the root layout so the probe runs once at boot and survives every
 * navigation. There is no middleware doing this instead: in mock mode the
 * session lives in localStorage and no cookie exists for a middleware to read
 * (ADR 0003).
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

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<SessionStatus>('checking')
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [nonce, setNonce] = useState(0)

  // The hint lives in localStorage, which the server cannot read: the server
  // snapshot is `false` and the store re-reads after hydration, so the two
  // renders agree and no effect has to copy the value into state.
  const hint = useSyncExternalStore(subscribeSessionHint, readSessionHint, serverSessionHint)

  useEffect(() => {
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
  }, [nonce])

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
      await api.auth.signOut()
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

  // A 401 from anywhere in the app means the cookie expired mid-session.
  // Registered here rather than imported by `http`, so the transport layer never
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

  const value = useMemo(
    () => ({ status, me, error, hint, signIn, signOut, recheck }),
    [status, me, error, hint, signIn, signOut, recheck],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
