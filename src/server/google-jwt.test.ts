import { generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { GOOGLE_TOKEN_URL, normalizePrivateKey, signGoogleAssertion } from './google-jwt'

/*
 * The assertion is signed by hand instead of by Google's library, and Google
 * answers a malformed one with nothing more useful than `invalid_grant`. What
 * can be checked without Google is checked here: the signature, the encoding
 * and every claim.
 */

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const EMAIL = 'fonnus-leads@fonnus-leads.iam.gserviceaccount.com'
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const NOW = new Date('2026-09-30T08:15:42.500Z')

function decode(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
}

describe('signGoogleAssertion', () => {
  const jwt = signGoogleAssertion({ email: EMAIL, privateKey, scope: SCOPE, now: NOW })
  const [header = '', claims = '', signature = ''] = jwt.split('.')

  it('has three base64url segments without padding', () => {
    expect(jwt.split('.')).toHaveLength(3)
    expect(jwt).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  })

  it('verifies against the public half of the key that signed it', () => {
    expect(verify('sha256', Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url'))).toBe(true)
  })

  it('names RS256, the only algorithm Google accepts', () => {
    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' })
  })

  it('claims the service account, the Sheets scope and the token endpoint, for at most an hour', () => {
    const iat = Math.floor(NOW.getTime() / 1000)
    expect(decode(claims)).toEqual({ iss: EMAIL, scope: SCOPE, aud: GOOGLE_TOKEN_URL, iat, exp: iat + 3600 })
    expect(GOOGLE_TOKEN_URL).toBe('https://oauth2.googleapis.com/token')
  })
})

describe('normalizePrivateKey', () => {
  it('turns a key pasted as one line with literal \\n into a PEM that signs', () => {
    const pasted = privateKey.replace(/\n/g, '\\n')
    expect(pasted).not.toContain('\n')

    const jwt = signGoogleAssertion({ email: EMAIL, privateKey: normalizePrivateKey(pasted), scope: SCOPE, now: NOW })
    const [header = '', claims = '', signature = ''] = jwt.split('.')
    expect(verify('sha256', Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url'))).toBe(true)
  })

  it('leaves a key that already has its line breaks as it is', () => {
    expect(normalizePrivateKey(privateKey)).toBe(privateKey)
  })
})
