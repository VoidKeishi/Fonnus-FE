import { isJsonMediaType, readCappedText } from './request-body'
import { budgetOf, charge, cookieHeader, readLedger, sameCharges, settle } from './voice-demo-budget'
import type { Budget, ConversationPage, Ledger } from './voice-demo-budget'
import type { ElevenLabsConfig, VoiceDemoConfig } from './env'

/*
 * The landing page's live voice demo, on the server: the ticket the browser
 * hands to ElevenLabs (ADR 0006 point 5) and the visitor's hour, which decides
 * whether there is one (ADR 0009).
 *
 * `POST /api/voice-demo/token` gives a call a WebRTC conversation token,
 * `200 { token }`, and a typed conversation a WebSocket signed URL,
 * `200 { signed_url }`, because only the WebSocket transport starts the agent
 * in text before it speaks (ADR 0007) — each with what the ticket may spend.
 * `GET /api/voice-demo/budget` says where the hour stands. Both read the
 * `voice_demo_budget` cookie, settle it against ElevenLabs's conversation
 * list, and write it back. A refusal is a bare status, or the one code the
 * screen acts on — nothing ElevenLabs said is ever echoed to the visitor.
 *
 * The environment, the clock and the upstream calls are injected and nothing
 * here imports `server-only`, so the ladders are tested without any of them.
 */

/*
 * Started with the handler and under the browser's own 15 s timeout
 * (docs/api-contract.md §1), so the server always answers first and the
 * browser never gives up on a request that is still minting here. One
 * deadline covers the conversation list and the mint together.
 */
const TOKEN_DEADLINE_MS = 8_000

const TOKEN_ROUTE = 'POST /api/voice-demo/token'
const BUDGET_ROUTE = 'GET /api/voice-demo/budget'

/**
 * An ElevenLabs call that failed: which one, and ElevenLabs's status, `null`
 * when none came back. Carries no key, token or response text. Defined here
 * rather than beside the calls, which import `server-only`, so a test can
 * build one.
 */
export class ElevenLabsRequestError extends Error {
  readonly step: 'token' | 'signed-url' | 'conversations'
  readonly status: number | null

  constructor(step: ElevenLabsRequestError['step'], status: number | null, options?: ErrorOptions) {
    super(`ElevenLabs ${step} request failed${status === null ? '' : ` with ${String(status)}`}`, options)
    this.name = 'ElevenLabsRequestError'
    this.step = step
    this.status = status
  }
}

/** A ticket, and the conversation id ElevenLabs gave with it, `null` when it gave none. */
export interface MintedTicket {
  ticket: string
  conversationId: string | null
}

export interface VoiceDemoDeps {
  config: () => VoiceDemoConfig | null
  mint: (config: ElevenLabsConfig, signal: AbortSignal) => Promise<MintedTicket>
  mintSignedUrl: (config: ElevenLabsConfig, signal: AbortSignal) => Promise<MintedTicket>
  listConversations: (config: ElevenLabsConfig, sinceUnixSeconds: number, signal: AbortSignal) => Promise<ConversationPage>
  /** Epoch milliseconds; `Date.now` unless a test fixes it. */
  now?: () => number
}

type Input = 'voice' | 'text'

/** `{}` is a call, as it was before typed conversations existed; anything else is `null`, a 400. */
function readInput(body: unknown): Input | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const input = (body as Record<string, unknown>).input
  if (input === undefined || input === 'voice') return 'voice'
  if (input === 'text') return 'text'
  return null
}

function status(code: number): Response {
  return new Response(null, { status: code })
}

/** Which call failed and how — never the key, the cookie, a token or what ElevenLabs answered. */
function logElevenLabsFailure(route: string, err: unknown, step: ElevenLabsRequestError['step']): void {
  if (err instanceof ElevenLabsRequestError) {
    const cause = err.cause instanceof Error ? err.cause.name : 'no response'
    const upstream = err.status === null ? cause : String(err.status)
    console.error(`${route}: ElevenLabs ${err.step} failed, upstream status ${upstream}`)
    return
  }
  console.error(`${route}: ElevenLabs ${step} failed (${err instanceof Error ? err.name : 'unknown'})`)
}

/**
 * The request's ledger, settled against the conversations of its window, and
 * whether settling changed a charge. A list that fails leaves the charges as
 * they were, which is never wrong in the visitor's favour (ADR 0009 point 2).
 */
async function readBudget(
  route: string,
  request: Request,
  deps: VoiceDemoDeps,
  config: VoiceDemoConfig,
  deadline: AbortSignal,
  now: number,
): Promise<{ ledger: Ledger | null; changed: boolean }> {
  const ledger = readLedger(request.headers.get('cookie'), config.cookieSecret, now)
  if (ledger === null || ledger.entries.length === 0) return { ledger, changed: false }
  try {
    const page = await deps.listConversations(config, Math.floor(ledger.windowStart / 1000), deadline)
    const settled = settle(ledger, page, now)
    return { ledger: settled, changed: !sameCharges(ledger, settled) }
  } catch (err) {
    logElevenLabsFailure(route, err, 'conversations')
    return { ledger, changed: false }
  }
}

function headersFor(ledger: Ledger | null, config: VoiceDemoConfig, now: number): Record<string, string> {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
  if (ledger) headers['Set-Cookie'] = cookieHeader(ledger, config.cookieSecret, now, config.secureCookie)
  return headers
}

/**
 * The ladder: 503, then 200. The cookie is written back only when settling
 * changed a charge (ADR 0009 point 3). A read that writes the cookie it found
 * can land after a ticket's answer from the same browser and erase the charge
 * that ticket just made.
 */
export async function handleVoiceDemoBudget(request: Request, deps: VoiceDemoDeps): Promise<Response> {
  const deadline = AbortSignal.timeout(TOKEN_DEADLINE_MS)
  const config = deps.config()
  if (config === null) return status(503)

  const now = (deps.now ?? Date.now)()
  const { ledger, changed } = await readBudget(BUDGET_ROUTE, request, deps, config, deadline, now)
  const body: Budget = budgetOf(ledger, now)
  return Response.json(body, { status: 200, headers: headersFor(changed ? ledger : null, config, now) })
}

/** The ladder: 415, 413, 400, 503, 429, 502, then 200. */
export async function handleVoiceDemoToken(request: Request, deps: VoiceDemoDeps): Promise<Response> {
  const deadline = AbortSignal.timeout(TOKEN_DEADLINE_MS)
  const clock = deps.now ?? Date.now

  // JSON even for the empty body of a call, so that another site cannot mint
  // a ticket with a simple request (`request-body.ts`).
  if (!isJsonMediaType(request.headers.get('content-type'))) return status(415)

  const text = await readCappedText(request.body)
  if (text === null) return status(413)

  let input: Input | null
  try {
    input = readInput(JSON.parse(text))
  } catch {
    return status(400)
  }
  if (input === null) return status(400)

  const config = deps.config()
  if (config === null) return status(503)

  const now = clock()
  const { ledger } = await readBudget(TOKEN_ROUTE, request, deps, config, deadline, now)
  const budget = budgetOf(ledger, now)
  if (budget.remaining_ms <= 0) {
    // The one refusal with a body: its code is what turns the screen to the
    // spent slot (docs/api-contract.md §5).
    return Response.json(
      { code: 'budget_spent', resets_at: budget.resets_at },
      {
        status: 429,
        headers: { ...headersFor(ledger, config, now), 'Content-Type': 'application/problem+json' },
      },
    )
  }

  // 502 rather than the 503 above, so the log and the client can tell an
  // ElevenLabs failure from a deployment that is switched off. Nothing is
  // charged for a ticket that was not minted, so the cookie is left alone.
  const typed = input === 'text'
  let minted: MintedTicket
  try {
    minted = typed ? await deps.mintSignedUrl(config, deadline) : await deps.mint(config, deadline)
  } catch (err) {
    logElevenLabsFailure(TOKEN_ROUTE, err, typed ? 'signed-url' : 'token')
    return status(502)
  }

  // Charged as of the mint, which the ticket's fifteen minutes count from.
  const mintedAt = clock()
  const charged = charge(ledger, minted.conversationId, mintedAt)
  const answer = { remaining_ms: charged.charged_ms, resets_at: budgetOf(charged.ledger, mintedAt).resets_at }
  const body = typed ? { signed_url: minted.ticket, ...answer } : { token: minted.ticket, ...answer }
  return Response.json(body, { status: 200, headers: headersFor(charged.ledger, config, mintedAt) })
}
