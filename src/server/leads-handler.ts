import 'server-only'
import { googleSheetsConfig } from './env'
import { GoogleRequestError } from './google-token'
import { leadRow } from './lead-rows'
import { parseLead } from './leads-input'
import { isJsonMediaType, readCappedText } from './request-body'
import { appendRows } from './sheets'
import type { FieldError } from '@/api/errors'

/*
 * `POST /api/leads`: the landing page's contact form, appended to the `leads`
 * tab (ADR 0005). The wire is docs/api-contract.md §6 `POST /leads`: 202 with
 * no body, or a 422 naming the fields. Every other refusal is a bare status —
 * nothing a server or Google said is ever echoed to the visitor.
 */

/*
 * One deadline for everything this request asks of Google, token and append
 * together, started when the handler starts. It sits under the browser's own
 * 15 s timeout (docs/api-contract.md §1) so the server always answers first,
 * and the browser never gives up on a request that is still writing here.
 * An append cut off by the deadline may still land if Google had already
 * received it; that is the one duplicate a resend can cause.
 */
const GOOGLE_DEADLINE_MS = 12_000

function status(code: number): Response {
  return new Response(null, { status: code })
}

function validationFailed(errors: readonly FieldError[]): Response {
  return Response.json(
    { code: 'validation_failed', errors: errors.map(({ field, code }) => ({ field, code })) },
    { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

/** Which call failed and how — never a field value, the key or the token. */
function logGoogleFailure(err: unknown): void {
  if (err instanceof GoogleRequestError) {
    const cause = err.cause instanceof Error ? err.cause.name : 'no response'
    const upstream = err.status === null ? cause : String(err.status)
    console.error(`POST /api/leads: Google ${err.step} failed, upstream status ${upstream}`)
    return
  }
  // A key that is not a valid PEM throws here, from the signing, before any request.
  console.error(`POST /api/leads: Google access failed (${err instanceof Error ? err.name : 'unknown'})`)
}

export async function handleLead(request: Request): Promise<Response> {
  const deadline = AbortSignal.timeout(GOOGLE_DEADLINE_MS)

  if (!isJsonMediaType(request.headers.get('content-type'))) return status(415)

  const text = await readCappedText(request.body)
  if (text === null) return status(413)

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return status(400)
  }

  // Checked before the configuration, so a bad form gets its field list even
  // on a deployment that cannot store anything.
  const parsed = parseLead(body)
  if (!parsed.ok) return validationFailed(parsed.errors)

  const config = googleSheetsConfig()
  if (config === null) return status(503)

  // Never retried here: the visitor keeps what they typed and can send again
  // (ADR 0005 point 10), and a retry after a timeout could write the row twice.
  try {
    await appendRows(config, 'leads', [leadRow(parsed.lead, new Date())], deadline)
  } catch (err) {
    logGoogleFailure(err)
    return status(503)
  }
  return status(202)
}
