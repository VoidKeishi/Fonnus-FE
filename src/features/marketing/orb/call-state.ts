import type { VoiceAgentState, VoiceEndReason, VoiceInput } from '@/api'
import {
  budgetLeftLine,
  budgetSpentLine,
  callAgainAfterLine,
  CHIP_TREE,
  ENDED_AGENT_LINE,
  ENDED_ERROR_LINE,
  ENDED_TIMEOUT_LINE,
  endedTimeoutLine,
} from '@/data/call-demo'
import type { SuggestionChip } from '@/data/call-demo'
import { remainingLabel, waitLabel } from './call-budget'
import type { CallBudget } from './use-call-budget'

/**
 * What the call screen says the receptionist is doing. A pure mapping, kept out
 * of the hook so the sentences are checkable without React.
 */
export type AgentState = VoiceAgentState

/**
 * A typed conversation names her, and has no microphone to mention. A voice
 * call says nothing of whether she speaks or listens, the owner's call: the
 * SDK's mode change lags her voice, so the prototype's "Fonnus đang nói" stayed
 * on after she had stopped, and the orb already moves with her voice. What a
 * call still says comes from the app's own state: connecting, and a microphone
 * the visitor turned off, whatever her mode. Null is an empty line.
 */
export function stateLabel(agent: AgentState, mic: boolean, input: VoiceInput): string | null {
  if (agent === 'connecting') return 'Đang kết nối…'
  if (input === 'text') return agent === 'speaking' ? 'Linh đang trả lời…' : 'Linh đang chờ bạn nhắn'
  return mic ? null : 'Micro đang tắt — bạn có thể gõ chữ'
}

/**
 * The consent slot's second line: what is left of the hour once part of it is
 * spent (ADR 0008). Null while the budget is not known, while all of it is
 * there (the server then names no reset), and when nothing is left.
 */
export function budgetLine(budget: CallBudget | null): string | null {
  return budget !== null && budget.remainingMs > 0 && budget.resetsAt !== null
    ? budgetLeftLine(remainingLabel(budget.remainingMs))
    : null
}

/** The slot shown instead of consent when nothing of the hour is left. */
export function spentLine(waitMs: number): string {
  return budgetSpentLine(waitLabel(waitMs))
}

/**
 * The ending's line. `user` never reaches the screen: closing the call closes
 * it. A call known to have spent the rest of the hour says when the next one
 * can start; one on the cap always does, unless the hour turned while it ran.
 * A budget not known yet says nothing of the hour.
 */
export function endingLine(reason: VoiceEndReason, budget: CallBudget | null): string {
  const waitMs = budget !== null && budget.remainingMs <= 0 ? budget.waitMs : null
  if (reason === 'timeout') return waitMs === null ? ENDED_TIMEOUT_LINE : endedTimeoutLine(waitLabel(waitMs))
  const line = reason === 'agent' ? ENDED_AGENT_LINE : ENDED_ERROR_LINE
  return waitMs === null ? line : `${line} ${callAgainAfterLine(waitLabel(waitMs))}`
}

/**
 * The chips shown once `chip` is sent, given every label sent by a chip in
 * this call, `chip` among them. A sent label is never offered again, by its
 * words: the tree repeats some. A chip with no set of its own, or whose set
 * is all sent, leads back to the first set, and that can run out too.
 */
export function chipsAfter(
  chip: SuggestionChip,
  sent: ReadonlySet<string>,
  first: readonly SuggestionChip[] = CHIP_TREE,
): readonly SuggestionChip[] {
  const unsent = (set: readonly SuggestionChip[]) => set.filter((next) => !sent.has(next.label))
  const followUps = unsent(chip.next ?? [])
  return followUps.length > 0 ? followUps : unsent(first)
}
