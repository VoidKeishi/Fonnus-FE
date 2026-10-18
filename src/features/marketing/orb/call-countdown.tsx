import { useEffect, useState } from 'react'
import { COUNTDOWN_LABEL, COUNTDOWN_WARNING_LINE, COUNTDOWN_WARNING_MS, countdownLine } from '@/data/call-demo'
import { clockLabel, nextTickMs } from './call-budget'

/*
 * The countdown under the call screen's title while a session runs (ADR
 * 0010). It counts to `endsAt`, the session's own cap, so it reaches "0:00"
 * at the cut. Each tick reads the clock against `endsAt` instead of taking a
 * second off, so a background tab whose timers were slowed shows the right
 * number when it comes back.
 *
 * Mounted once per session, keyed on `endsAt`, so a second call of the hour
 * starts with its own state.
 */
export function CallCountdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now)
  // A call that starts inside the last thirty seconds was just told so by the consent line.
  const [warns] = useState(() => endsAt - Date.now() > COUNTDOWN_WARNING_MS)
  const leftMs = Math.max(0, endsAt - now)

  useEffect(() => {
    if (leftMs <= 0) return
    const timer = setTimeout(() => {
      setNow(Date.now())
    }, nextTickMs(leftMs))
    return () => {
      clearTimeout(timer)
    }
  }, [leftMs])

  return (
    <>
      {/* A timer is not announced as it changes; the hidden label names it
          for a screen reader that lands on it. */}
      <span role="timer" className="tabular-nums">
        <span className="sr-only">{COUNTDOWN_LABEL}: </span>
        {countdownLine(clockLabel(leftMs))}
      </span>
      {/* Mounted empty with the session, so the region exists before its one line arrives. */}
      <span aria-live="polite" className="sr-only">
        {warns && leftMs <= COUNTDOWN_WARNING_MS ? COUNTDOWN_WARNING_LINE : ''}
      </span>
    </>
  )
}
