import 'server-only'
import { normalizePrivateKey } from './google-jwt'

/*
 * The server-side counterpart of `src/api/env.ts`, and the only file under
 * `src/server/` that reads `process.env` (`eslint.config.mjs`). It holds two
 * groups of secrets, one function each: the leads spreadsheet's Google
 * credentials (ADR 0005) and the landing voice demo's ElevenLabs key and agent
 * with the secret that signs its budget cookie (ADR 0006, ADR 0009). None is
 * prefixed `NEXT_PUBLIC_`, so none is inlined into a bundle, and the
 * `server-only` import above fails the build if a client file ever reaches
 * this one.
 *
 * Read per request, never at import time, so `next build` runs without them
 * and a missing one is a 503 rather than a crash (ADR 0005 point 8).
 */

export interface GoogleSheetsConfig {
  serviceAccountEmail: string
  /** PEM with real line breaks. */
  privateKey: string
  spreadsheetId: string
}

/** `null` when any of the three is unset or empty. */
export function googleSheetsConfig(): GoogleSheetsConfig | null {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? ''
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '').trim()
  const spreadsheetId = process.env.LEADS_SPREADSHEET_ID?.trim() ?? ''
  if (!serviceAccountEmail || !privateKey || !spreadsheetId) return null
  return { serviceAccountEmail, privateKey, spreadsheetId }
}

/** What every ElevenLabs call takes: the key and the private agent it speaks for. */
export interface ElevenLabsConfig {
  apiKey: string
  agentId: string
}

export interface VoiceDemoConfig extends ElevenLabsConfig {
  /** Signs the `voice_demo_budget` cookie (ADR 0009 point 1). */
  cookieSecret: string
  /**
   * The cookie is `Secure` in production always and in development never: a
   * phone on the LAN reaches `pnpm dev` over plain http, where a `Secure`
   * cookie is dropped and every tap would be a fresh hour.
   */
  secureCookie: boolean
}

/**
 * `null` when any of the three is unset or empty, and both voice routes answer
 * 503. Unsetting the key is the voice demo's kill switch (ADR 0006 point 6);
 * without the cookie secret there is no budget to keep, so no ticket either.
 */
export function voiceDemoConfig(): VoiceDemoConfig | null {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() ?? ''
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim() ?? ''
  const cookieSecret = process.env.VOICE_DEMO_COOKIE_SECRET?.trim() ?? ''
  if (!apiKey || !agentId || !cookieSecret) return null
  return { apiKey, agentId, cookieSecret, secureCookie: process.env.NODE_ENV === 'production' }
}
