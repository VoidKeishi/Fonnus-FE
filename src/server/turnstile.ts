import 'server-only'
import { TurnstileRequestError } from './voice-demo-handler'
import type { TurnstileVerdict } from './voice-demo-handler'

/*
 * Cloudflare Turnstile's server-side check of the token every voice demo
 * ticket costs (ADR 0009 point 5). One `POST` to siteverify per ticket
 * request: a token validates once, so it is never retried, and the
 * `idempotency_key` is what Cloudflare would need to answer a retry the same.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Cloudflare's codes are short and few; a cap keeps an odd answer from flooding a log line. */
const MAX_CODES = 8
const MAX_CODE_LENGTH = 40

/**
 * What Cloudflare said of `token`: `{ ok: true }`, or `{ ok: false, codes }`
 * with its `error-codes`. Throws `TurnstileRequestError` for the deadline, a
 * network failure, any non-2xx, or a 2xx that is not an object with a boolean
 * `success`. A failure's body is discarded unread. `remoteip` is sent only
 * when there is one.
 */
export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteip: string | null,
  signal: AbortSignal,
): Promise<TurnstileVerdict> {
  const payload = {
    secret,
    response: token,
    idempotency_key: crypto.randomUUID(),
    ...(remoteip === null ? {} : { remoteip }),
  }
  let response: Response
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (err) {
    throw new TurnstileRequestError(null, { cause: err })
  }
  if (!response.ok) {
    await response.body?.cancel()
    throw new TurnstileRequestError(response.status)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    // No cause: a JSON syntax error quotes the start of the body it choked on.
    throw new TurnstileRequestError(response.status)
  }
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const success = fields.success
  if (typeof success !== 'boolean') throw new TurnstileRequestError(response.status)
  if (success) return { ok: true }
  const reported = Array.isArray(fields['error-codes']) ? (fields['error-codes'] as unknown[]) : []
  const codes = reported
    .filter((code): code is string => typeof code === 'string')
    .slice(0, MAX_CODES)
    .map((code) => code.slice(0, MAX_CODE_LENGTH))
  return { ok: false, codes }
}
