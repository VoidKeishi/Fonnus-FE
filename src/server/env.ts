import 'server-only'
import { normalizePrivateKey } from './google-jwt'

/*
 * The server-side counterpart of `src/api/env.ts`, and the only file under
 * `src/server/` that reads `process.env` (`eslint.config.mjs`). It holds two
 * groups of secrets, one function each: the leads spreadsheet's Google
 * credentials (ADR 0005) and the landing voice demo's ElevenLabs key and agent
 * (ADR 0006). None is prefixed `NEXT_PUBLIC_`, so none is inlined into a
 * bundle, and the `server-only` import above fails the build if a client file
 * ever reaches this one.
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

export interface ElevenLabsConfig {
  apiKey: string
  agentId: string
}

/**
 * `null` when either is unset or empty. Unsetting the key is the voice demo's
 * kill switch (ADR 0006 point 6).
 */
export function elevenLabsConfig(): ElevenLabsConfig | null {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() ?? ''
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim() ?? ''
  if (!apiKey || !agentId) return null
  return { apiKey, agentId }
}
