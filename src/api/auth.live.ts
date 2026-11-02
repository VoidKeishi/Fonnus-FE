/**
 * Auth against the real backend.
 *
 * Endpoints and bodies: `docs/api-contract.md` §2, which mirrors
 * `../Fonnus-BE/docs/api.md` §Auth (ADR 0011). The session is two httpOnly
 * cookies the browser sends by itself (`credentials: 'include'`, set once in
 * `http.ts`); nothing here reads them.
 *
 * `expect401: true` on every call here is load-bearing: a 401 on these routes is
 * an answer, not an expired access token, and must never start the refresh in
 * `http.ts` — refresh itself is one of them, and the probe would loop.
 */
import type { AuthApi, Me, OtpSent } from './contracts'
import { ApiError } from './errors'
import { http } from './http'

export const authLive: AuthApi = {
  async me(opts) {
    let refreshed: { user_id: string }
    try {
      // Mints a fresh access token from the refresh cookie and slides the
      // 30 days: the refresh cookie is the only memory of who is signed in.
      refreshed = await http.post<{ user_id: string }>('/auth/refresh', undefined, {
        signal: opts?.signal,
        expect401: true,
      })
    } catch (e) {
      // `unauthorized` (no or revoked cookie) and `session_expired` both mean anonymous.
      if (e instanceof ApiError && e.kind === 'unauthorized') return null
      throw e
    }
    try {
      return await http.get<Me>(`/users/${encodeURIComponent(refreshed.user_id)}`, {
        signal: opts?.signal,
        expect401: true,
      })
    } catch (e) {
      // A definite "no such user" — deleted while the cookie lived, or not
      // this user's id — is not "unreachable": there is no owner to retry for,
      // and every retry would slide the dead session another 30 days. Drop the
      // cookies, best effort, and answer anonymous.
      if (e instanceof ApiError && (e.kind === 'notfound' || e.kind === 'forbidden')) {
        await authLive.logout().catch(() => undefined)
        return null
      }
      throw e
    }
  },

  requestLoginOtp(mobile_number, opts) {
    // The backend answers 400/404/422/429/502 here, never 401; `expect401` only
    // keeps a surprise 401 from starting a refresh.
    return http.post<OtpSent>('/auth/login', { mobile_number }, { signal: opts?.signal, expect401: true })
  },

  async verifyLoginOtp(input, opts) {
    // Sets `fonnus_access` and `fonnus_refresh` on success.
    const { user } = await http.post<{ user: Me }>('/auth/login/verify-otp', input, {
      signal: opts?.signal,
      expect401: true,
    })
    return user
  },

  async logout(opts) {
    await http.post('/auth/logout', undefined, { signal: opts?.signal, expect401: true, parse: 'none' })
  },
}
