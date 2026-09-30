/**
 * The landing page's contact form, stored in the leads spreadsheet
 * (docs/adr/0005-leads-to-google-sheets.md).
 *
 * POST only; Next.js answers any other method with 405. The work is in
 * `src/server/leads-handler.ts`, which only the route tree may import.
 */
import { handleLead } from '@/server/leads-handler'

export function POST(request: Request): Promise<Response> {
  return handleLead(request)
}
