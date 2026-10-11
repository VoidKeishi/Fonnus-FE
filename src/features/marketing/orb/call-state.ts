import type { VoiceAgentState, VoiceInput } from '@/api'

/**
 * What the call screen says the receptionist is doing. A pure mapping, kept out
 * of the hook so the sentences are checkable without React.
 */
export type AgentState = VoiceAgentState

/**
 * The voice call keeps the prototype's four sentences. A typed conversation
 * names her, and has no microphone to mention.
 */
export function stateLabel(agent: AgentState, mic: boolean, input: VoiceInput): string {
  if (agent === 'connecting') return 'Đang kết nối…'
  if (input === 'text') return agent === 'speaking' ? 'Linh đang trả lời…' : 'Linh đang chờ bạn nhắn'
  if (agent === 'speaking') return 'Fonnus đang nói'
  return mic ? 'Fonnus đang nghe' : 'Micro đang tắt — bạn có thể gõ chữ'
}
