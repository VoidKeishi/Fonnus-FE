import 'server-only'
import { listConversations } from './elevenlabs-conversations'
import { mintConversationToken, mintSignedUrl } from './elevenlabs-token'
import { voiceDemoConfig } from './env'
import { verifyTurnstile } from './turnstile'
import { handleVoiceDemoBudget, handleVoiceDemoToken } from './voice-demo-handler'
import type { VoiceDemoDeps } from './voice-demo-handler'

/** The real environment and the real ElevenLabs and Cloudflare calls, which the two voice routes share. */
const deps: VoiceDemoDeps = {
  config: voiceDemoConfig,
  mint: mintConversationToken,
  mintSignedUrl,
  listConversations,
  verifyTurnstile,
}

export function voiceDemoToken(request: Request): Promise<Response> {
  return handleVoiceDemoToken(request, deps)
}

export function voiceDemoBudget(request: Request): Promise<Response> {
  return handleVoiceDemoBudget(request, deps)
}
