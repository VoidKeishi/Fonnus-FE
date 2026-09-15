/**
 * Auth against the real backend.
 *
 * Endpoints and bodies: `docs/api-contract.md` §2. Every call sends the session
 * cookie (`credentials: 'include'`, set once in `http.ts`).
 *
 * `expect401: true` on the probe and the OTP routes is load-bearing: a 401 there
 * means "anonymous" or "wrong code", not "your session expired". Without it the
 * global sign-out handler fires, which re-probes, which 401s again.
 */
import type { AuthApi, GoogleAccount, Me } from './contracts'
import { ApiError } from './errors'
import { http } from './http'

export const authLive: AuthApi = {
  async me(opts) {
    try {
      return await http.get<Me>('/me', { signal: opts?.signal, expect401: true })
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'unauthorized') return null
      throw e
    }
  },

  sendPhoneCode(phone, opts) {
    return http.post<{ existing_account: boolean }>(
      '/auth/otp',
      { phone },
      { signal: opts?.signal, expect401: true },
    )
  },

  async sendEmailCode(email, opts) {
    await http.post('/auth/otp/email', { email }, { signal: opts?.signal, expect401: true, parse: 'none' })
  },

  verifyCode(input, opts) {
    // Sets the session cookie on success.
    return http.post<Me>('/auth/otp/verify', input, { signal: opts?.signal, expect401: true })
  },

  updateProfile(input, opts) {
    return http.patch<Me>('/me', input, { signal: opts?.signal })
  },

  async signOut(opts) {
    await http.post('/auth/signout', undefined, { signal: opts?.signal, parse: 'none' })
  },

  // The live flow is a redirect, so there is no in-page chooser to populate.
  googleAccounts(): readonly GoogleAccount[] {
    return []
  },

  googleAuthUrl() {
    return '/auth/google'
  },

  signInWithGoogle(): Promise<Me> {
    return Promise.reject(
      new ApiError({
        kind: 'unknown',
        code: 'google_uses_redirect',
        cause: 'Live Google sign-in is a redirect to googleAuthUrl(), not an in-page chooser.',
      }),
    )
  },
}
