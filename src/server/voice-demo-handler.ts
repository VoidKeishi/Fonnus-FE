import { isJsonMediaType, readCappedText } from './request-body'
import type { ElevenLabsConfig } from './env'

/*
 * `POST /api/voice-demo/token`: the ticket the landing page's live voice demo
 * hands to ElevenLabs (ADR 0006 point 5). `200 { token }` or a bare status —
 * nothing ElevenLabs said is ever echoed to the visitor. The environment and
 * the upstream call are injected and nothing here imports `server-only`, so
 * the ladder is tested without either.
 */

/*
 * Started with the handler and under the browser's own 15 s timeout
 * (docs/api-contract.md §1), so the server always answers first and the
 * browser never gives up on a request that is still minting here.
 */
const TOKEN_DEADLINE_MS = 8_000

const PATH = '/api/voice-demo/token'

/**
 * An ElevenLabs call that failed: which one, and ElevenLabs's status, `null`
 * when none came back. Carries no key, token or response text. Defined here
 * rather than beside the call, which imports `server-only`, so a test can
 * build one.
 */
export class ElevenLabsRequestError extends Error {
  readonly step: 'token'
  readonly status: number | null

  constructor(step: 'token', status: number | null, options?: ErrorOptions) {
    super(`ElevenLabs ${step} request failed${status === null ? '' : ` with ${String(status)}`}`, options)
    this.name = 'ElevenLabsRequestError'
    this.step = step
    this.status = status
  }
}

export interface VoiceDemoDeps {
  config: () => ElevenLabsConfig | null
  mint: (config: ElevenLabsConfig, signal: AbortSignal) => Promise<string>
}

function status(code: number): Response {
  return new Response(null, { status: code })
}

/** Which call failed and how — never the key, the token or what ElevenLabs answered. */
function logElevenLabsFailure(err: unknown): void {
  if (err instanceof ElevenLabsRequestError) {
    const cause = err.cause instanceof Error ? err.cause.name : 'no response'
    const upstream = err.status === null ? cause : String(err.status)
    console.error(`POST ${PATH}: ElevenLabs ${err.step} failed, upstream status ${upstream}`)
    return
  }
  console.error(`POST ${PATH}: ElevenLabs token failed (${err instanceof Error ? err.name : 'unknown'})`)
}

/** The ladder: 415, 413, 400, 503, 502, then 200. */
export async function handleVoiceDemoToken(request: Request, deps: VoiceDemoDeps): Promise<Response> {
  const deadline = AbortSignal.timeout(TOKEN_DEADLINE_MS)

  // There are no fields. The body must still be JSON so that another site
  // cannot mint a token with a simple request (`request-body.ts`).
  if (!isJsonMediaType(request.headers.get('content-type'))) return status(415)

  const text = await readCappedText(request.body)
  if (text === null) return status(413)

  try {
    JSON.parse(text)
  } catch {
    return status(400)
  }

  const config = deps.config()
  if (config === null) return status(503)

  // 502 rather than the 503 above, so the log and the client can tell an
  // ElevenLabs failure from a deployment that is switched off.
  let token: string
  try {
    token = await deps.mint(config, deadline)
  } catch (err) {
    logElevenLabsFailure(err)
    return status(502)
  }
  return Response.json({ token }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
