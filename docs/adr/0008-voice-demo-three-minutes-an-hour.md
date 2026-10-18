# ADR 0008: The voice demo's three minutes are an hour's budget, kept by the browser

**Status:** accepted · **Date:** 2026-10-15 · Amends [ADR 0006](./0006-elevenlabs-landing-voice-demo.md) point 6 · Points 4 and 6 superseded by [ADR 0009](./0009-voice-demo-budget-on-the-server.md): the server keeps the budget in a signed cookie, the `localStorage` ledger is gone, and the token route refuses a spent hour

## Decision

A visitor gets three minutes of conversation with Linh per hour, spent over as many calls
as they like, rather than three minutes per call and as many calls as they like. The
budget is kept in the visitor's browser and nothing on the server changes.

1. **One budget per browser per hour.** The budget is `MAX_CALL_MS` (175 seconds, the
   per-call cap ADR 0006 chose under the agent's 180), so one uninterrupted call spends the
   whole hour and the agent's own cap stays above every call. The window is fixed, not
   sliding: it opens with the first call that connects and closes sixty minutes later, when
   the full budget is back. A fixed window is what the screen can say in one sentence
   ("gọi lại được sau 42 phút"); a sliding one has no single answer to "when".
2. **Seconds count from the moment a session is handed to the screen until it ends**, for
   any reason: the receptionist hung up, the cap, a dropped connection, or the visitor
   closing the call. Connecting does not count, and a call that never connects spends
   nothing. A text session (ADR 0007) counts exactly as a call does.
3. **The next call is capped at what is left.** `VoiceApi.connect` takes `maxDurationMs`,
   the screen's own cap for this session, and the session ends with `timeout` when it
   elapses, as it did at 175 seconds. Any positive remainder opens a call, down to a few
   seconds that cut Linh mid-greeting: the floor was considered and dropped, because the
   visitor who comes back for their last seconds asked for them.
4. **The ledger lives in `localStorage`, in the call demo's own directory**
   (`src/features/marketing/orb/`), read inside the tap that opens the call and written
   when a session is attached, when it ends, and on `pagehide`, so a tab closed mid-call
   still records what it spent. An entry left open by a crash counts as running until it
   would have hit the cap. It is read only inside event handlers, never during render, so
   `useSyncExternalStore` is not needed (CLAUDE.md §Things that are load-bearing).
5. **The screen says where the hour stands at the two moments it matters.** On the consent
   slot, when less than the full budget is left, a second line says how much ("Giờ này bạn
   còn 40 giây gọi thử."). When nothing is left — on opening the call, or on the ending of
   the call that spent it — the slot says so, says when the budget is back, and offers
   "Vào danh sách chờ" but not "Gọi lại": a button that would open a failed call is a
   promise the screen cannot keep (the same reasoning that removed the voice picker, ADR
   0006 point 10). The wait it names is as of the moment the slot appeared and is not
   counted down; one timer at the hour's turn gives the slot its ordinary shape back. No
   countdown during the call either: the prototype's call screen is the orb, a way to
   type and a way out, and stays so.
6. **Nothing on the server changes.** The token route mints a ticket for anyone who asks,
   as before; the agent's `max_duration_seconds` stays 180 as the backstop; the Firewall
   rate limit on the route stays the owner's setup, keyed on IP (ADR 0006 point 6). The
   budget is a rule for ordinary visitors, not a wall against a determined one: clearing
   site data or a private window gives a fresh hour, and this ADR accepts that.

## Why

- Three minutes per call with unlimited "Gọi lại" is three minutes of nothing: the cost
  exposure is the plan's concurrency times forever, which is what ADR 0006 point 6 said
  the rate limit alone could not cap per visitor. An hour's budget caps it per browser,
  which is where ordinary visitors live.
- Only the browser knows how long a call lasted. The route sees the start of a call (a
  ticket) and nothing of its end; function instances share no memory (ADR 0005 point 9);
  this repo reads no database (ADR 0003, `../Fonnus/docs/adr/0013`). A per-hour budget in
  seconds can therefore be kept honestly in one place today, and that place is the
  browser. The server-side count arrives with Fonnus-BE's voice gateway (ADR 0006's first
  revisit trigger), which sees both ends of every call; `docs/open-questions.md` carries
  the ask.
- Counting seconds rather than calls is the owner's reading of "ba phút mỗi tiếng": a
  visitor who leaves and comes back has not used the hour up, only the seconds they spoke.

## Rejected

- **One call per hour.** The simplest rule and the only one the route could enforce (a
  ticket is a call), but it is not what three minutes an hour means: a visitor who closed
  at twenty seconds would wait an hour for the rest.
- **A signed cookie counted by the route.** The route could count tickets per hour per
  cookie without a database, but tickets are starts, not seconds, so it would be a second
  rule beside this one rather than this one; and it is cleared as easily as `localStorage`.
  ADR 0006's "device cookie" step stays available for the day usage shows abuse.
- **A browser fingerprint as the key.** A fingerprint is a key, not a memory: the server
  still has nowhere to look it up without a database. It collides on the phones this
  audience uses (two iPhones of one model and OS read the same), the browsers that matter
  deliberately perturb it, and it is a covert identifier collected before any consent on a
  page that promises not to keep the visitor's voice (PDPL, Law 91/2025/QH15; `CONTEXT.md`
  §Legal). It would also be a fifth runtime dependency.
- **Enforcing the budget in `voice.live.ts`.** The budget is a product rule about the demo,
  not about the transport; the day the file is rewritten for Fonnus-BE's gateway, the rule
  must survive, so it lives above the seam and reaches the session as `maxDurationMs`.
- **A floor under the last call** (no call under ten seconds). Dropped at the owner's call:
  ten seconds is enough to hear Linh, and the seconds are the visitor's.
- **A countdown on the call screen.** It would be the first number on a screen the
  prototype drew without one, for a situation (a second call in the hour) most visitors
  never reach. The consent line carries the number instead.

## Assumed, to confirm during the build

- `pagehide` fires on a phone when the visitor switches apps and the tab is later
  discarded, so the open entry is closed with the right time rather than counted to the
  cap. Settled by a call on a phone with a switch away mid-call; if it does not, the
  entry's cap-bound count is the fallback and costs the visitor at most the call they
  abandoned.
- `Date.now()` is the clock for both the window and the entries, and a visitor who moves
  their device clock is a visitor this ADR does not defend against.
- A page holding a live WebRTC or WebSocket connection is not kept in the back-forward
  cache, so a call never resumes from one. The build does not depend on it: `pagehide`
  closes the call outright, so a restored page shows no call and the ledger agrees.

## Revisit when

- Fonnus-BE serves the web voice gateway. The gateway sees both ends of every call and
  should keep this budget per caller on the server; the browser's ledger then becomes the
  hint that lets the screen say "còn 40 giây" before the gateway answers, as the session
  hint does for sign-in (`src/session/session.ts`).
- Usage shows visitors clearing site data to call again. ADR 0006's next steps apply: a
  device cookie counted by the route, then a Firewall challenge.
- The owner changes the hour or the three minutes. Both are two constants in
  `call-budget.ts`; the sentences that say them are in `src/data/call-demo.ts`.
