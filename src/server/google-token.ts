import 'server-only'
import { GOOGLE_TOKEN_URL, signGoogleAssertion } from './google-jwt'
import type { GoogleSheetsConfig } from './env'

/*
 * One access token for the Sheets API, from the service account's signed
 * assertion (ADR 0005 point 6), and the one way this directory talks to Google.
 */

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

/** A token this close to its expiry is replaced rather than sent. */
const REFRESH_MARGIN_MS = 60_000

/** A Google call that failed: which one, and Google's status, `null` when none came back. */
export class GoogleRequestError extends Error {
  readonly step: 'token' | 'append'
  readonly status: number | null

  constructor(step: 'token' | 'append', status: number | null, options?: ErrorOptions) {
    super(`Google ${step} request failed${status === null ? '' : ` with ${String(status)}`}`, options)
    this.name = 'GoogleRequestError'
    this.step = step
    this.status = status
  }
}

/**
 * `fetch` that throws `GoogleRequestError` for the deadline, a network failure
 * or any non-2xx. The signal is required: every Google call runs under the
 * handler's one deadline. The caller reads the body of a success; a failure's
 * body is discarded unread, so nothing Google says can reach a log or a visitor.
 */
export async function googleFetch(
  step: 'token' | 'append',
  url: string,
  init: RequestInit & { signal: AbortSignal },
): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (err) {
    throw new GoogleRequestError(step, null, { cause: err })
  }
  if (!response.ok) {
    await response.body?.cancel()
    throw new GoogleRequestError(step, response.status)
  }
  return response
}

/*
 * Reused while this function instance stays warm. Nothing depends on that: a
 * cold instance, or a second one beside this, starts empty and signs again,
 * which costs one round trip and nothing else.
 */
let cached: { token: string; expiresAt: number } | null = null

function tokenFrom(body: unknown): { token: string; lifetimeMs: number } | null {
  if (typeof body !== 'object' || body === null) return null
  const { access_token, expires_in } = body as Record<string, unknown>
  if (typeof access_token !== 'string' || !access_token || typeof expires_in !== 'number') return null
  return { token: access_token, lifetimeMs: expires_in * 1000 }
}

export async function sheetsAccessToken(config: GoogleSheetsConfig, signal: AbortSignal): Promise<string> {
  const now = Date.now()
  if (cached !== null && now < cached.expiresAt - REFRESH_MARGIN_MS) return cached.token

  const assertion = signGoogleAssertion({
    email: config.serviceAccountEmail,
    privateKey: config.privateKey,
    scope: SHEETS_SCOPE,
    now: new Date(now),
  })
  const response = await googleFetch('token', GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal,
  })

  let body: unknown
  try {
    body = await response.json()
  } catch (err) {
    throw new GoogleRequestError('token', response.status, { cause: err })
  }
  const issued = tokenFrom(body)
  if (issued === null) throw new GoogleRequestError('token', response.status)

  cached = { token: issued.token, expiresAt: now + issued.lifetimeMs }
  return issued.token
}
