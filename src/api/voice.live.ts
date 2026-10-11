/**
 * The voice demo against a real receptionist.
 *
 * Replaced by the ElevenLabs session in the next pull request (ADR 0006). Until
 * then `connect` always rejects, and the call demo falls back to the scripted
 * session, so `NEXT_PUBLIC_API_LIVE_GROUPS=voice` changes nothing a visitor sees.
 */
import type { VoiceApi } from './contracts'
import { ApiError } from './errors'

export const voiceLive: VoiceApi = {
  connect() {
    return Promise.reject(new ApiError({ kind: 'unknown', code: 'voice_unavailable' }))
  },
}
