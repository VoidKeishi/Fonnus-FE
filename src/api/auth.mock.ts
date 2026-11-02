/**
 * Auth, faked in the browser. Nothing leaves the tab and no credential is stored.
 *
 * This is the file that keeps the demo working: phone 0914378064, code 111002.
 * Any other six digits reaches the wrong-code state, and a number outside
 * `REGISTERED_PHONES` reaches "no account", which is how those screens stay
 * reviewable.
 *
 * The "session" is a `Me` object in localStorage. That is the mock's entire
 * database — in live mode the session is two httpOnly cookies the browser holds
 * and this file is not loaded. There is no refresh here: the stored `Me` does
 * not expire (ADR 0011 point 7).
 */
import { normalizePhone } from './phone'
import type { AuthApi, Me, Signal } from './contracts'
import { ApiError } from './errors'
import { DEMO_ACCOUNT, REGISTERED_PHONES, delay, maybeFail, storage } from './mock-support'

const SESSION_KEY = 'fonnus.session'

/** Fixed, so a reload reads back the same owner. */
const DEMO_USER_ID = '7f3c2a9e-1b5d-4c8e-9a2f-3d6e8b1c4f70'

/** The backend's cooldown and code lifetime, as `POST /auth/login` reports them. */
const RESEND_AFTER_SECONDS = 60
const OTP_EXPIRES_IN_SECONDS = 120

function readStored(): Me | null {
  const raw = storage.read(SESSION_KEY)
  if (!raw) return null
  try {
    const stored = JSON.parse(raw) as Partial<Me>
    // A session stored before ADR 0011 has another shape; treat it as signed out.
    return typeof stored.id === 'string' && typeof stored.mobile_number === 'string' ? (stored as Me) : null
  } catch {
    return null
  }
}

function notFound(): ApiError {
  return new ApiError({ kind: 'notfound', status: 404, code: 'mobile_number_not_found' })
}

export const authMock: AuthApi = {
  async me(opts?: Signal) {
    await delay(0.3, opts?.signal)
    return readStored()
  },

  async requestLoginOtp(mobile_number, opts) {
    await delay(1.4, opts?.signal)
    maybeFail('ratelimited', 'otp_rate_limited')
    const normalized = normalizePhone(mobile_number)
    if (!REGISTERED_PHONES.has(normalized)) throw notFound()
    return {
      mobile_number: normalized,
      otp_expires_in_seconds: OTP_EXPIRES_IN_SECONDS,
      resend_after_seconds: RESEND_AFTER_SECONDS,
    }
  },

  async verifyLoginOtp({ mobile_number, code }, opts) {
    await delay(1.55, opts?.signal)
    maybeFail()
    const normalized = normalizePhone(mobile_number)
    // The backend checks the account before the code.
    if (!REGISTERED_PHONES.has(normalized)) throw notFound()
    if (code !== DEMO_ACCOUNT.code) {
      throw new ApiError({ kind: 'validation', status: 400, code: 'otp_invalid' })
    }
    const me: Me = { id: DEMO_USER_ID, mobile_number: normalized, full_name: DEMO_ACCOUNT.displayName }
    storage.write(SESSION_KEY, JSON.stringify(me))
    return me
  },

  async logout(opts) {
    await delay(0.3, opts?.signal)
    storage.remove(SESSION_KEY)
  },
}
