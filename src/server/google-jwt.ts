import { sign } from 'node:crypto'

/*
 * The signed assertion Google's OAuth server exchanges for an access token —
 * the service-account "JWT bearer" grant. Built by hand rather than with
 * google-auth-library (ADR 0005 point 6): it is one RS256 signature over two
 * small JSON objects.
 */

/** Where the assertion is exchanged, and therefore its audience. */
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** Google refuses an assertion that lives longer than an hour. */
const LIFETIME_SECONDS = 3600

export interface AssertionInput {
  /** The service account's email: the issuer. */
  email: string
  /** PEM, PKCS#8 — the `private_key` of the service account's JSON key. */
  privateKey: string
  scope: string
  now: Date
}

/**
 * The PEM with real line breaks. A key pasted into a hosting dashboard often
 * arrives as one line with literal `\n` sequences where the breaks were; a key
 * that already has them is returned as it is.
 */
export function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, '\n')
}

/** JSON, then base64url without padding, as JWT requires. */
function segment(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function signGoogleAssertion({ email, privateKey, scope, now }: AssertionInput): string {
  const iat = Math.floor(now.getTime() / 1000)
  const header = segment({ alg: 'RS256', typ: 'JWT' })
  const claims = segment({ iss: email, scope, aud: GOOGLE_TOKEN_URL, iat, exp: iat + LIFETIME_SECONDS })
  const unsigned = `${header}.${claims}`
  // An RSA key with no padding named signs PKCS#1 v1.5, which with SHA-256 is RS256.
  const signature = sign('sha256', Buffer.from(unsigned), privateKey).toString('base64url')
  return `${unsigned}.${signature}`
}
