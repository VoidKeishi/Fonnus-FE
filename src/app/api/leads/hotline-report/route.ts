/**
 * The "Chấm điểm hotline" request, one spreadsheet row per location
 * (docs/adr/0005-leads-to-google-sheets.md).
 *
 * POST only; Next.js answers any other method with 405. The work is in
 * `src/server/leads-handler.ts`, which only the route tree may import.
 */
import { handleHotlineReport } from '@/server/leads-handler'

export function POST(request: Request): Promise<Response> {
  return handleHotlineReport(request)
}
