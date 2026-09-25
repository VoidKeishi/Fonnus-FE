import type { CallDemo, CallTurn } from '@/data/call-demos'

/*
 * Everything a sample call shows at a given second, as pure functions of the
 * elapsed time. The player keeps one number — how far into the call it is —
 * and draws the rest from it in render.
 */

/** Seconds into the call at `nowMs`, for a clock started at `startedAtMs` from `from` seconds in; never past the end. */
export function elapsedSince(demo: CallDemo, from: number, startedAtMs: number, nowMs: number): number {
  return Math.min(demo.duration, from + (nowMs - startedAtMs) / 1000)
}

/** Share of the call already played, 0 to 1. */
export function progressAt(demo: CallDemo, elapsed: number): number {
  return Math.min(1, Math.max(0, elapsed / demo.duration))
}

export function isFinished(demo: CallDemo, elapsed: number): boolean {
  return elapsed >= demo.duration
}

/** The turns already spoken, in call order. */
export function turnsHeard(demo: CallDemo, elapsed: number): CallTurn[] {
  return demo.turns.filter((turn) => elapsed >= turn.at)
}

/** Whether the call has reached the moment its action card appears. */
export function actionReached(demo: CallDemo, elapsed: number): boolean {
  return elapsed >= demo.actionAt
}

/** Whether a waveform bar sits behind the playhead. */
export function isBarPlayed(index: number, barCount: number, progress: number): boolean {
  return index / barCount <= progress
}

/** `m:ss`, whole seconds rounded down, as a player's clock reads. */
export function formatClock(seconds: number): string {
  const whole = Math.floor(seconds)
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`
}
