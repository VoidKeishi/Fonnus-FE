/**
 * Auth, faked in the browser. Nothing leaves the tab and no credential is stored.
 *
 * This is the file that keeps the demo working: phone 0914378064, code 111002.
 * Any other six digits reaches the wrong-code state, which is how that screen
 * stays reviewable.
 *
 * The "session" is a `Me` object in localStorage. That is the mock's entire
 * database — in live mode the session is an httpOnly cookie the browser holds
 * and this file is not loaded.
 */
import { isValidEmail, normalizePhone } from '../features/auth/phone'
import type { AuthApi, GoogleAccount, Me, Signal } from './contracts'
import { ApiError } from './errors'
import { DEMO_ACCOUNT, GOOGLE_ACCOUNTS, REGISTERED_PHONES, delay, maybeFail, storage } from './mock-support'

const SESSION_KEY = 'fonnus.session'

function readStored(): Me | null {
  const raw = storage.read(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Me
  } catch {
    return null
  }
}

function store(me: Me): Me {
  storage.write(SESSION_KEY, JSON.stringify(me))
  return me
}

/** Everything the demo account knows about itself. */
function demoMe(identity: string, method: Me['method'], displayName?: string): Me {
  return {
    identity,
    method,
    display_name: displayName || DEMO_ACCOUNT.displayName,
    clinic_name: DEMO_ACCOUNT.clinic,
    plan: DEMO_ACCOUNT.plan,
  }
}

export const authMock: AuthApi = {
  async me(opts?: Signal) {
    await delay(0.3, opts?.signal)
    return readStored()
  },

  async sendPhoneCode(phone, opts) {
    await delay(1.4, opts?.signal)
    maybeFail('ratelimited', 'otp_rate_limited')
    return { existing_account: REGISTERED_PHONES.has(normalizePhone(phone)) }
  },

  async sendEmailCode(email, opts) {
    await delay(1.4, opts?.signal)
    if (!isValidEmail(email)) {
      throw new ApiError({ kind: 'validation', status: 422, code: 'invalid_email' })
    }
    maybeFail('ratelimited', 'otp_rate_limited')
  },

  async verifyCode({ identity, code }, opts) {
    await delay(1.55, opts?.signal)
    maybeFail()
    if (code !== DEMO_ACCOUNT.code) {
      throw new ApiError({ kind: 'unauthorized', status: 401, code: 'otp_invalid' })
    }
    const method: Me['method'] = identity.includes('@') ? 'email' : 'phone'
    return store(demoMe(identity, method))
  },

  async updateProfile(input, opts) {
    await delay(1.1, opts?.signal)
    maybeFail()
    const current = readStored() ?? demoMe(input.phone ?? '', 'phone')
    return store({
      ...current,
      display_name: input.full_name?.trim() || current.display_name,
      identity: current.identity || normalizePhone(input.phone ?? ''),
    })
  },

  async signOut(opts) {
    await delay(0.3, opts?.signal)
    storage.remove(SESSION_KEY)
  },

  googleAccounts(): readonly GoogleAccount[] {
    return GOOGLE_ACCOUNTS
  },

  // null means "render the in-page chooser" — there is no client ID to redirect with.
  googleAuthUrl() {
    return null
  },

  async signInWithGoogle(account, opts) {
    await delay(1.1, opts?.signal)
    maybeFail()
    return store(demoMe(account.email, 'google', account.name))
  },
}
