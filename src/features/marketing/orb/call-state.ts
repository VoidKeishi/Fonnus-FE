/**
 * What the call screen says the receptionist is doing. A pure mapping, kept out
 * of the hook so the four sentences are checkable without React.
 */
export type AgentState = 'ringing' | 'speaking' | 'listening'

export function stateLabel(agent: AgentState, mic: boolean): string {
  if (agent === 'ringing') return 'Đang kết nối…'
  if (agent === 'speaking') return 'Fonnus đang nói'
  return mic ? 'Fonnus đang nghe' : 'Micro đang tắt — bạn có thể gõ chữ'
}
