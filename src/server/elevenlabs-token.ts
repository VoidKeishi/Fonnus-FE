import 'server-only'
import { ElevenLabsRequestError } from './voice-demo-handler'
import type { ElevenLabsConfig } from './env'

/*
 * One WebRTC conversation token for the private landing-demo agent (ADR 0006
 * point 5), and the one way this directory talks to ElevenLabs. Never reused:
 * each call on the landing page gets its own.
 */

const TOKEN_URL = 'https://api.elevenlabs.io/v1/convai/conversation/token'

/*
 * The success body is `{ "token": "…", "conversation_id": "…" }` (the API
 * reference for this endpoint, read 2026-10-11). Only the token is needed. If the
 * field were ever renamed, every mint would fail with a 2xx upstream status in
 * the log, which is how it would show itself.
 */
const TOKEN_FIELD = 'token'

/**
 * Throws `ElevenLabsRequestError` for the deadline, a network failure, any
 * non-2xx, or a 2xx without a token. A failure's body is discarded unread, so
 * nothing ElevenLabs says can reach a log or a visitor.
 */
export async function mintConversationToken(config: ElevenLabsConfig, signal: AbortSignal): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${TOKEN_URL}?agent_id=${encodeURIComponent(config.agentId)}`, {
      headers: { 'xi-api-key': config.apiKey, Accept: 'application/json' },
      signal,
    })
  } catch (err) {
    throw new ElevenLabsRequestError('token', null, { cause: err })
  }
  if (!response.ok) {
    await response.body?.cancel()
    throw new ElevenLabsRequestError('token', response.status)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    // No cause: a JSON syntax error quotes the start of the body it choked on.
    throw new ElevenLabsRequestError('token', response.status)
  }
  const token = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[TOKEN_FIELD] : undefined
  if (typeof token !== 'string' || !token) throw new ElevenLabsRequestError('token', response.status)
  return token
}
