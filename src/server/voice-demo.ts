import 'server-only'
import { mintConversationToken } from './elevenlabs-token'
import { elevenLabsConfig } from './env'
import { handleVoiceDemoToken } from './voice-demo-handler'

/** The token route with the real environment and the real ElevenLabs call wired in. */
export function voiceDemoToken(request: Request): Promise<Response> {
  return handleVoiceDemoToken(request, { config: elevenLabsConfig, mint: mintConversationToken })
}
