import type { VoiceAgentState, VoiceEndReason, VoiceInput } from '@/api'
import {
  budgetLeftLine,
  budgetSpentLine,
  callAgainAfterLine,
  ENDED_AGENT_LINE,
  ENDED_ERROR_LINE,
  ENDED_TIMEOUT_LINE,
  endedTimeoutLine,
} from '@/data/call-demo'
import { HOUR_BUDGET_MS, remainingLabel, waitLabel } from './call-budget'

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

/** The consent slot's second line: what is left of the hour, or null while all of it is (ADR 0008). */
export function budgetLine(remainingMs: number): string | null {
  return remainingMs > 0 && remainingMs < HOUR_BUDGET_MS ? budgetLeftLine(remainingLabel(remainingMs)) : null
}

/** The slot shown instead of consent when nothing of the hour is left. */
export function spentLine(waitMs: number): string {
  return budgetSpentLine(waitLabel(waitMs))
}

/**
 * The ending's line. `user` never reaches the screen: closing the call closes
 * it. A call that spent the rest of the hour says when the next one can start;
 * one on the cap always did, unless the hour turned while it ran.
 */
export function endingLine(reason: VoiceEndReason, remainingMs: number, waitMs: number): string {
  const spent = remainingMs <= 0
  if (reason === 'timeout') return spent ? endedTimeoutLine(waitLabel(waitMs)) : ENDED_TIMEOUT_LINE
  const line = reason === 'agent' ? ENDED_AGENT_LINE : ENDED_ERROR_LINE
  return spent ? `${line} ${callAgainAfterLine(waitLabel(waitMs))}` : line
}
