import 'server-only'
import { googleSheetsConfig } from './env'
import { GoogleRequestError } from './google-token'
import { hotlineRows, leadRow } from './lead-rows'
import { parseHotlineReport, parseLead } from './leads-input'
import { isJsonMediaType, readCappedText } from './request-body'
import { appendRows } from './sheets'
import type { FieldError } from '@/api/errors'

/*
 * The two marketing forms, each appended to its tab of the leads spreadsheet
 * (ADR 0005): `POST /api/leads` to `leads`, `POST /api/leads/hotline-report`
 * to `hotline_report`. The wire is docs/api-contract.md §6: 202 with no body,
 * or a 422 naming the fields. Every other refusal is a bare status — nothing
 * a server or Google said is ever echoed to the visitor.
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
function logGoogleFailure(path: string, err: unknown): void {
  if (err instanceof GoogleRequestError) {
    const cause = err.cause instanceof Error ? err.cause.name : 'no response'
    const upstream = err.status === null ? cause : String(err.status)
    console.error(`POST ${path}: Google ${err.step} failed, upstream status ${upstream}`)
    return
  }
  // A key that is not a valid PEM throws here, from the signing, before any request.
  console.error(`POST ${path}: Google access failed (${err instanceof Error ? err.name : 'unknown'})`)
}

/** A checked body: the rows to append, or the fields to refuse. */
type Checked = { ok: true; rows: string[][] } | { ok: false; errors: readonly FieldError[] }

interface FormEndpoint {
  /** The route, for the log line. */
  path: string
  tab: string
  check: (body: unknown) => Checked
}

/** The ladder both forms share: 415, 413, 400, 422, 503, then 202. */
async function receiveForm(request: Request, { path, tab, check }: FormEndpoint): Promise<Response> {
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
  const checked = check(body)
  if (!checked.ok) return validationFailed(checked.errors)

  const config = googleSheetsConfig()
  if (config === null) return status(503)

  // Never retried here: the visitor keeps what they typed and can send again
  // (ADR 0005 point 10), and a retry after a timeout could write the rows twice.
  try {
    await appendRows(config, tab, checked.rows, deadline)
  } catch (err) {
    logGoogleFailure(path, err)
    return status(503)
  }
  return status(202)
}

export function handleLead(request: Request): Promise<Response> {
  return receiveForm(request, {
    path: '/api/leads',
    tab: 'leads',
    check: (body) => {
      const parsed = parseLead(body)
      return parsed.ok ? { ok: true, rows: [leadRow(parsed.lead, new Date())] } : parsed
    },
  })
}

export function handleHotlineReport(request: Request): Promise<Response> {
  return receiveForm(request, {
    path: '/api/leads/hotline-report',
    tab: 'hotline_report',
    check: (body) => {
      const parsed = parseHotlineReport(body)
      // Every location is one row, all in one append; the id ties them together.
      return parsed.ok ? { ok: true, rows: hotlineRows(parsed.report, new Date(), crypto.randomUUID()) } : parsed
    },
  })
}
