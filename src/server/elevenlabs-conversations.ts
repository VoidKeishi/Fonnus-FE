import 'server-only'
import { ElevenLabsRequestError } from './voice-demo-handler'
import { readConversationPage } from './voice-demo-budget'
import type { ConversationPage } from './voice-demo-budget'
import type { ElevenLabsConfig } from './env'

/*
 * The agent's conversation list, which the voice demo's budget is settled
 * from (ADR 0009 point 2): how long each conversation of the hour really
 * lasted. The list endpoint and never the per-conversation one, which returns
 * the transcript — personal data this app has promised not to keep. What is
 * read of the body is `readConversationPage`'s, beside the arithmetic it
 * feeds, so that it is tested.
 */

const CONVERSATIONS_URL = 'https://api.elevenlabs.io/v1/convai/conversations'

/**
 * One page, and no paging: past the agent's 100th conversation of an hour,
 * the page says it is incomplete, and settling refunds nothing it cannot see
 * (ADR 0009, accepted residual risk).
 */
const PAGE_SIZE = '100'

/**
 * The agent's conversations started since `sinceUnixSeconds`. Throws
 * `ElevenLabsRequestError` for the deadline, a network failure, any non-2xx,
 * or a 2xx without the list. A failure's body is discarded unread.
 */
export async function listConversations(
  config: ElevenLabsConfig,
  sinceUnixSeconds: number,
  signal: AbortSignal,
): Promise<ConversationPage> {
  const params = new URLSearchParams({
    agent_id: config.agentId,
    call_start_after_unix: String(sinceUnixSeconds),
    page_size: PAGE_SIZE,
  })
  let response: Response
  try {
    response = await fetch(`${CONVERSATIONS_URL}?${params.toString()}`, {
      headers: { 'xi-api-key': config.apiKey, Accept: 'application/json' },
      signal,
    })
  } catch (err) {
    throw new ElevenLabsRequestError('conversations', null, { cause: err })
  }
  if (!response.ok) {
    await response.body?.cancel()
    throw new ElevenLabsRequestError('conversations', response.status)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    // No cause: a JSON syntax error quotes the start of the body it choked on.
    throw new ElevenLabsRequestError('conversations', response.status)
  }
  const page = readConversationPage(body)
  if (page === null) throw new ElevenLabsRequestError('conversations', response.status)
  return page
}
