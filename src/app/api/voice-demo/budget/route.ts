/**
 * Where the visitor's hour of the landing voice demo stands
 * (docs/adr/0009-voice-demo-budget-on-the-server.md), read by the call screen
 * as it opens and as a call ends.
 *
 * GET only; Next.js answers any other method with 405. The work is in
 * `src/server/voice-demo.ts`, which only the route tree may import.
 */
import { voiceDemoBudget } from '@/server/voice-demo'

export function GET(request: Request): Promise<Response> {
  return voiceDemoBudget(request)
}
