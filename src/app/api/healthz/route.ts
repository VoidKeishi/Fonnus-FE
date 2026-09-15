/**
 * Liveness for whatever ends up running this app.
 *
 * It answers for the Next.js server only — it says nothing about Fonnus-BE,
 * which has its own `/healthz`. A frontend that reported its backend's health
 * would take itself out of rotation for an outage it cannot fix.
 */
export const dynamic = 'force-dynamic'

export function GET(): Response {
  return Response.json({ status: 'ok' })
}
