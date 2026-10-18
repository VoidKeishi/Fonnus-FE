import 'server-only'
import { ElevenLabsRequestError } from './voice-demo-handler'
import type { MintedTicket } from './voice-demo-handler'
import type { ElevenLabsConfig } from './env'

/*
 * The two tickets for the private landing-demo agent (ADR 0006 point 5, ADR
 * 0007): a WebRTC conversation token for a call, a WebSocket signed URL for a
 * typed conversation. Never reused: each call on the landing page gets its
 * own. The conversation list the budget is settled from is
 * `elevenlabs-conversations.ts`.
 */

const TOKEN_URL = 'https://api.elevenlabs.io/v1/convai/conversation/token'
const SIGNED_URL_URL = 'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url'

/*
 * The success bodies are `{ "token": "…", "conversation_id": "…" }` and
 * `{ "signed_url": "wss://…" }` (the API reference for each endpoint, read
 * 2026-10-11). If a ticket field were ever renamed, every mint would fail with
 * a 2xx upstream status in the log, which is how it would show itself. The
 * conversation id ties the ticket to its row of the conversation list (ADR
 * 0009 point 2); the signed URL's answer is assumed to carry it once asked for
 * with `include_conversation_id`, and without it the ticket is still minted
 * and only the fifteen-minute rule refunds it.
 */
const TOKEN_FIELD = 'token'
const SIGNED_URL_FIELD = 'signed_url'
const CONVERSATION_ID_FIELD = 'conversation_id'

/**
 * Throws `ElevenLabsRequestError` for the deadline, a network failure, any
 * non-2xx, or a 2xx without the token. A failure's body is discarded unread, so
 * nothing ElevenLabs says can reach a log or a visitor.
 */
export function mintConversationToken(config: ElevenLabsConfig, signal: AbortSignal): Promise<MintedTicket> {
  return fetchTicket('token', TOKEN_URL, TOKEN_FIELD, config, signal)
}

/**
 * The same, for the signed URL a text-only conversation opens its WebSocket
 * with. Asked for with `include_conversation_id`, which ElevenLabs documents as
 * making the URL single-use: without it the same URL opens conversations for
 * fifteen minutes.
 */
export function mintSignedUrl(config: ElevenLabsConfig, signal: AbortSignal): Promise<MintedTicket> {
  return fetchTicket('signed-url', SIGNED_URL_URL, SIGNED_URL_FIELD, config, signal, { include_conversation_id: 'true' })
}

async function fetchTicket(
  step: ElevenLabsRequestError['step'],
  url: string,
  field: string,
  config: ElevenLabsConfig,
  signal: AbortSignal,
  query: Record<string, string> = {},
): Promise<MintedTicket> {
  const params = new URLSearchParams({ agent_id: config.agentId, ...query })
  let response: Response
  try {
    response = await fetch(`${url}?${params.toString()}`, {
      headers: { 'xi-api-key': config.apiKey, Accept: 'application/json' },
      signal,
    })
  } catch (err) {
    throw new ElevenLabsRequestError(step, null, { cause: err })
  }
  if (!response.ok) {
    await response.body?.cancel()
    throw new ElevenLabsRequestError(step, response.status)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    // No cause: a JSON syntax error quotes the start of the body it choked on.
    throw new ElevenLabsRequestError(step, response.status)
  }
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const ticket = fields[field]
  if (typeof ticket !== 'string' || !ticket) throw new ElevenLabsRequestError(step, response.status)
  const conversationId = fields[CONVERSATION_ID_FIELD]
  return { ticket, conversationId: typeof conversationId === 'string' && conversationId ? conversationId : null }
}
