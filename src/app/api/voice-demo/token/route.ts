/**
 * The ticket the landing page's live voice demo needs before the browser can
 * talk to the ElevenLabs agent (docs/adr/0006-elevenlabs-landing-voice-demo.md).
 *
 * POST only; Next.js answers any other method with 405. The work is in
 * `src/server/voice-demo.ts`, which only the route tree may import.
 */
import { voiceDemoToken } from '@/server/voice-demo'

export function POST(request: Request): Promise<Response> {
  return voiceDemoToken(request)
}
