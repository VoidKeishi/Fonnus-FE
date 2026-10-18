# ADR 0010: The call screen counts down the visitor's three minutes, which are exactly 180 seconds

**Status:** accepted · **Date:** 2026-10-18 · Supersedes [ADR 0008](./0008-voice-demo-three-minutes-an-hour.md) point 5's "No countdown during the call either" and its rejected "A countdown on the call screen" · Amends [ADR 0006](./0006-elevenlabs-landing-voice-demo.md) point 6, [ADR 0007](./0007-voice-demo-agent-only-and-text-fallback.md) point 6 and [ADR 0009](./0009-voice-demo-budget-on-the-server.md) points 1 and 2: the call's cap and the hour's budget are 180 seconds, and the agent's `max_duration_seconds` is 190

## Decision

1. **While a session runs, a line under the call screen's title counts down:** `2:39 / 3:00`,
   what is left of the hour's three minutes over all three. It runs in a voice call and in a
   typed conversation alike, since both spend the same minutes (ADR 0008 point 2). A second
   call in the hour starts from what is left, `1:20 / 3:00`, so the line says these are the
   hour's minutes and not this call's length.
2. **Nowhere else.** The consent slot, the connecting state, the endings and a failed call
   leave the line empty. Consent and the endings already say the number in words (ADR 0008
   point 5), and a still `0:00` beside a spent slot would sit there for an hour. Connecting
   shows nothing, because the server has charged the ticket but the call has not started.
3. **The line's row is kept from the moment the screen opens**, empty until a session runs.
   The orb is placed on its slot when the slot changes size, not when it moves
   (`call-overlay.tsx`). A header that grew when the call connected would push the slot
   down and leave the orb where it was.
4. **The count comes from the session.** `VoiceSession.endsAt` is the moment in epoch
   milliseconds when the session's own cap ends it, set where that timer starts. The number
   on the screen and the moment of the cut therefore cannot disagree, and the screen does not
   repeat the cap's arithmetic above the seam. Each tick reads the clock against `endsAt`
   instead of taking a second off, so a background tab whose timers were slowed shows the
   right number when the visitor comes back to it. Seconds are rounded up, so `0:00` shows at
   the cut and not one second before it.
5. **The budget is exactly 180 seconds.** `MAX_CALL_MS` and `HOUR_BUDGET_MS` were 175
   seconds, under the agent's 180. With a countdown, a full hour would then open on
   `2:55 / 3:00`, five seconds that look lost before anyone has spoken. Both are 180 seconds
   now, and the agent's `max_duration_seconds` goes up to 190 in the ElevenLabs dashboard, so
   the client still ends the call first, with the app's words. If the deployment goes out
   before the dashboard changes, nothing breaks: the agent's cut arrives as
   `max_duration_exceeded`, which the session already reports as `timeout`, and the countdown
   stops at about `0:01` instead of `0:00`.
6. **Screen readers.** The line is a `timer`, which a screen reader does not announce as it
   changes, with a hidden label, "Thời gian gọi thử còn lại", for a reader that lands on it.
   One polite announcement, "Còn 30 giây gọi thử.", is made when the count crosses thirty
   seconds. A call that starts with thirty seconds or less makes none, because the consent
   line has just said the number.

## Why

- The owner decided it. ADR 0008 turned the countdown down because a second call in the hour
  is rare, but the first call ends on the cap as well: a visitor who talks for three minutes
  is cut off mid-sentence with no warning. The number is that warning.
- Remaining over total, because the visitor's question is "how long do I have", and the total
  shows that the minutes belong to the hour.
- 180 seconds rather than 175, because the screen now shows the number, and it has to match
  every sentence that says "3 phút".

## Rejected

- **Elapsed over total**, the media player's convention. The visitor would have to subtract to
  know how long is left.
- **This call's own length as the total** (`1:20 / 1:20` for a second call). It hides that
  the minutes are the hour's.
- **Keeping 175 seconds and showing `/ 2:55`.** Honest, but the number disagrees with every
  sentence on the screen that says three minutes.
- **The count on the consent slot and the endings too.** It repeats lines that already say it.
- **The hook timing the call from when it attached the session.** It would be a second clock
  beside the cap's, and the cap's clamp copied above the seam.
- **A colour change near the end.** A new token and a new visual rule, for a job one sentence
  to a screen reader does.

## Assumed, to confirm during the build

- The owner raises `max_duration_seconds` to 190 before this deploys. Until then the agent
  cuts first and the countdown stops at about `0:01`, with the right ending.
- A visitor partway through an hour when this deploys gains five seconds: their cookie was
  charged against 175 and is now read against 180. Accepted.

## Revisit when

- The owner changes the three minutes: `MAX_CALL_MS`, `HOUR_BUDGET_MS`, and the `3:00` in
  `countdownLine` (`src/data/call-demo.ts`) move together.
- Fonnus-BE's voice gateway replaces `voice.live.ts`. Its session must give `endsAt` too, or
  the countdown has nothing to count to.
