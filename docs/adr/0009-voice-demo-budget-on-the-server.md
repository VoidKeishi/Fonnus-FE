# ADR 0009: The voice demo's hour is kept by the server, in a signed cookie, and every ticket is minted behind a Turnstile check

**Status:** accepted · **Date:** 2026-10-18 · Amends [ADR 0006](./0006-elevenlabs-landing-voice-demo.md) point 6 · Supersedes [ADR 0008](./0008-voice-demo-three-minutes-an-hour.md) points 4 and 6 · Points 1 and 2 amended by [ADR 0010](./0010-voice-demo-countdown.md): `HOUR_BUDGET_MS` is 180 seconds

## Decision

The three minutes an hour of ADR 0008 stay the rule, and the browser stops being the one that
keeps it. The server mints no ticket for a browser whose hour is spent, learns how long each
call really lasted from ElevenLabs, and asks Cloudflare Turnstile whether the thing tapping
"Bắt đầu gọi" is a browser at all. The demo stays anonymous: no phone number, no e-mail, no
sign-in, no IP as an identity, no fingerprint, no database.

1. **The budget lives in a signed cookie the server writes.** `voice_demo_budget`, `httpOnly`,
   `Secure`, `SameSite=Lax`, `Path=/api/voice-demo`, `Max-Age` to the end of the hour. The
   payload is `{ v: 1, windowStart, entries: [{ id, at, ms }] }`: the window's opening time,
   and one entry per ticket minted in it — the conversation id ElevenLabs gave, when it was
   minted, and what it is charged. It is signed with HMAC-SHA256 under a new server variable,
   `VOICE_DEMO_COOKIE_SECRET`; a cookie that does not verify, does not parse, or names a
   window that has ended reads as no cookie, which is the full budget. The window is fixed,
   as ADR 0008 point 1 chose, and `HOUR_BUDGET_MS` (175 s) and `WINDOW_MS` (60 min) move with
   the arithmetic into `src/server/`.
2. **Charging is pessimistic; refunds come from ElevenLabs.** Minting a ticket charges the
   whole remaining budget at once: the first call of an hour is charged 175 s before it has
   started, and the second ticket is refused until the first is refunded. Every time the
   budget is read, the server lists the agent's conversations started since `windowStart`
   (`GET /v1/convai/conversations?agent_id=…&call_start_after_unix=…&page_size=100`) and
   re-charges each entry it finds at its real `call_duration_secs` once the status is
   `processing`, `done` or `failed`; an entry still `initiated` or `in-progress` stays charged
   in full. An entry that does not appear in the list fifteen minutes after it was minted is
   refunded entirely: both tickets die after fifteen minutes, so a conversation that never
   started never will. The list endpoint, never the per-conversation one: the latter returns
   the transcript, which is personal data this app has promised not to keep and must not
   pull. If the list call fails, the pessimistic charges stand and the failure is logged as
   step plus upstream status (ADR 0006 point 9), never anything else.
3. **Two routes, one cookie.** `GET /api/voice-demo/budget` answers
   `200 { remaining_ms, resets_at }` (`resets_at` is `null` while the full budget is there),
   refreshing the cookie when a refund changed it. It costs nothing at ElevenLabs beyond the
   list call, so it needs no Turnstile token. `POST /api/voice-demo/token` keeps its ladder
   and grows three rungs: `403` when the Turnstile token is missing, spent or refused, `429
   { code: "budget_spent", resets_at }` when nothing of the hour is left, and on success `200
   { token | signed_url, remaining_ms, resets_at }` with the cookie set — `remaining_ms` is
   what this ticket may spend, and the session caps itself on it. The signed URL for a typed
   conversation is requested with `include_conversation_id=true`, which ElevenLabs documents
   as making the URL single-use.
4. **The client reads the budget, never keeps it.** The `localStorage` ledger, the entry
   arithmetic and the `pagehide` write of ADR 0008 point 4 are deleted. `VoiceApi` gains
   `budget()`; `connect` loses `maxDurationMs` and takes the cap from the ticket's answer,
   because the day Fonnus-BE's gateway mints the ticket, the cap comes with it the same way.
   The screen's sentences — `remainingLabel`, `waitLabel`, the lines of ADR 0008 point 5 —
   stay exactly as they are; only where their numbers come from changes:
   - The consent slot opens at once, with no second line. `GET /budget` runs as it opens;
     its answer adds "Giờ này bạn còn … gọi thử." or swaps the slot for its spent shape. If
     the read fails, the slot stays in its ordinary shape and the tap on "Bắt đầu gọi" gets
     the real answer: a `429` turns it into the spent shape (with `resets_at` from a second
     `GET /budget`, since `http.ts` keeps a refusal's `code` and nothing else), and if that
     read fails too, the call is shown as failed with ADR 0007's line.
   - An ending shows its line at once. For `timeout` the hour is spent by construction and
     the ticket's `resets_at` says when it is back, with no round trip. For `agent` and
     `error` the slot keeps "Gọi lại" and reads `GET /budget` about five seconds after the
     ending — not at once: ElevenLabs lists a call as `in-progress` for a few seconds after
     hang-up, and an immediate read would see the pessimistic charge, flip the slot to spent
     and flip it back. The answer either drops the button and adds "Gọi lại được sau …" or
     leaves it. A read that fails leaves it: the tap tells the truth. One timer at
     `resets_at` reads again, so the slot turns back into its ordinary shape when the hour
     does. A spent answer to the read that follows a `429` is read once more after five
     seconds, for the same reason.
5. **Every ticket is minted behind Cloudflare Turnstile, in Invisible mode, fail closed.**
   `api.js` loads from Cloudflare's exact URL (`?render=explicit`) when the consent slot
   opens — the posture `@elevenlabs/client` already has (ADR 0006 point 3) — in parallel
   with `GET /budget`, and renders one widget with `execution: 'execute'` into a container
   in the call overlay. The tap on "Bắt đầu gọi" or "Gọi lại" waits for the widget's token,
   running the challenge again first when the last token is older than its 300 seconds or
   already spent; the token travels as `challenge` through `connect` and as
   `turnstile_token` in the request body. A microphone refusal costs no token: the voice
   attempt asks for the microphone before it posts, so the text attempt inside the same tap
   posts the same unspent token. The server verifies it with
   `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` (`secret`, `response`,
   `remoteip` from `x-forwarded-for`, an `idempotency_key` UUID) under the route's existing
   8-second deadline. No token, a refused token, a blocked script, a widget that never calls
   back within the 15-second connection budget (ADR 0006 point 7), or a siteverify call that
   fails: no ticket, and the screen shows ADR 0007's "Không kết nối được với Linh lúc này".
   No new copy, no new state.
6. **Three new variables, all required.** `VOICE_DEMO_COOKIE_SECRET` and
   `TURNSTILE_SECRET_KEY` join the ElevenLabs pair in `src/server/env.ts`'s one function for
   the voice demo; any of the four missing is the route's `503`, as before.
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is read in `src/api/env.ts` and is not a secret.
   `.env.example` carries Cloudflare's always-pass test pair for development — site key
   `1x00000000000000000000BB` (Invisible), secret `1x0000000000000000000000000000000AA` — and
   an empty cookie secret with the command that makes one.
7. **One line more in `CONTEXT.md` §Legal.** After the visitor taps the orb, Turnstile sends
   their IP address, TLS fingerprint and User-Agent to Cloudflare, for bot detection only.
   Nothing on the call screen changes: the consent line is about what the visitor says, and
   Turnstile reads nothing of that.
8. **The owner's three limits on the agent, which this ADR depends on**: `bursting_enabled`
   off (its default lets calls exceed the workspace concurrency at double the price), the
   `max_duration_seconds` override off (on, a client picks its own call length), and
   `agent_concurrency_limit` around 5 (its default is unlimited). The Vercel Firewall rule of
   ADR 0006 point 6 moves to the backlog.

## Why

- The rule of ADR 0008 is enforced by nothing a visitor cannot delete. The demo is live in
  production, and the exposure is the plan's concurrency times forever for anyone who clears
  site data, opens a private window, or skips the browser and posts to the route with `curl`
  — which never touched the ledger, never honoured `maxDurationMs`, and got a fresh 180
  seconds from the agent each time.
- ADR 0008 rejected a cookie counted by the route because "tickets are starts, not seconds".
  The conversation list is what makes a cookie count seconds: ElevenLabs sees both ends of
  every call, and the conversation id in each ticket's answer ties a cookie entry to a row of
  that list. Charging the whole remainder first and refunding by the real duration means the
  server is never wrong in the visitor's favour while it waits for ElevenLabs; the cost is a
  second call of the hour that is refused for the few seconds between the first one ending
  and ElevenLabs marking it `processing` (the assumptions below).
- The identity is the cookie, not the IP, because the one person who demonstrates this
  product most does it on a clinic's wifi with several devices behind one address, and
  because Vietnamese mobile carriers put many visitors behind one address (CGNAT). A per-IP
  budget would block the sales demo and nobody else.
- Turnstile is what makes "no cookie, no budget" cost something. A script that sends no
  cookie is a fresh visitor to the cookie rule; Turnstile makes each of its mints a solved
  challenge, and solving challenges at scale costs real money through solver services. It is
  invisible, free, needs no new dependency (a script tag and a `fetch`), and the fail-closed
  posture reuses a state the screen already has.
- The cookie is `httpOnly` and signed not to defend against replay — an old cookie gives no
  more than no cookie, and that case is Turnstile's — but so that the browser cannot edit
  the entries, which is the hole `localStorage` had.

## Rejected

- **Identification by IP** (a Firewall rule, or a per-IP budget). See "Why": the sales demo's
  wifi and CGNAT. The one Firewall rate-limit rule stays in the backlog as a coarse ceiling,
  deferred by the owner until there are customers to protect.
- **A shared store** (Redis, a key-value add-on, a database table) keyed on the cookie. It
  would count in one place and need no list call, but this repo reads no database
  (`../Fonnus/docs/adr/0013`), and the server-side count that deserves a store is
  Fonnus-BE's voice gateway, which sees both ends of every call without asking a vendor.
- **A browser fingerprint.** Rejected in ADR 0008 and not reopened: collisions on identical
  phones, PDPL, and a dependency.
- **A refund reported by the client** ("my call lasted 20 s"). The client is the thing this
  ADR stops trusting.
- **ElevenLabs's post-call webhook** as the refund source. It needs somewhere to write the
  duration to, which is the shared store above.
- **The per-conversation endpoint** for the refund. It returns the transcript; the list
  endpoint returns the duration and nothing a visitor said.
- **A daily cost ceiling** (counting across all visitors). The owner chose not to set one
  now; the agent's concurrency limit is the ceiling under everything.
- **Keeping `maxDurationMs` on `connect`** and having the screen pass `remaining_ms` back in.
  The ticket's answer already is the authority; a second path for the same number is a
  second place to be wrong.

## Accepted residual risk

A script that solves Turnstile and sends no cookie gets a fresh budget on every mint; only the
agent's concurrency limit bounds it. Accepted at today's traffic. A visitor whose browser
blocks `challenges.cloudflare.com` cannot start the demo and is told it could not connect,
which is true and is the price of failing closed. The conversation list is read one page of
100 at a time: in an hour with more than 100 conversations on the agent, entries off the first
page keep their pessimistic charge, which costs a visitor a refund and never gives one away.
The cookie holds at most 24 entries; past that, the oldest are folded into one fixed charge
and refunded no further, so the cookie stays under the 4 KB a browser keeps.

## Assumed, to confirm with a live call

- The signed URL's answer carries the `conversation_id` when `include_conversation_id=true`.
  ElevenLabs documents the parameter ("if included, the conversation_signature cannot be
  used again") but its response schema lists only `signed_url`. The WebRTC token's answer
  does carry it, documented as `{ token, conversation_id }`. Settled by one typed session:
  decode the `voice_demo_budget` cookie in DevTools › Application (base64url, the part
  before the dot) and read `entries[0].id`. If the id does not
  come back, a typed conversation is charged pessimistically and refunded only by the
  fifteen-minute rule of point 2, and this ADR says so.
- One WebRTC conversation token opens one session. Settled by minting a token and starting
  two sessions with it; if the second connects, the pessimistic charge still bounds the pair
  to one cap each at the agent.
- A conversation leaves `in-progress` within a few seconds of hang-up, and
  `call_duration_secs` is final once it is `processing`. Settled by polling the list during
  a call and right after it ends. If it lags, the ending slot's read happens a few seconds
  later, or twice.
- Turnstile's `api.js` loaded when the consent slot opens, rather than with the page as
  Cloudflare recommends, gives a token within the connection budget on a phone connection.
  Settled by the first live call on a phone; the fallback is loading it with the orb's first
  click instead, which is still never with the page.
- The ElevenLabs API key the route uses, restricted to the Conversational AI scope as
  `README.md` advises, may list conversations. If it may not, every read logs
  `conversations failed, upstream status 401` (or `403`), nothing is ever refunded, and every
  visitor gets one call an hour: the demo still works, and worse than this ADR intends.
  Settled by the first `GET /api/voice-demo/budget` with a cookie, on the production key.
- A budget read five seconds after hang-up finds the conversation past `in-progress`. If it
  usually does not, the delay grows, or the ending reads twice.
- An Invisible widget runs inside a zero-size, `aria-hidden` container in the call dialog,
  and `reset` followed by `execute` on a widget rendered with `execution: 'execute'` gives a
  fresh token each tap. Settled by two taps in a row with the network panel open: two
  siteverify calls, both successful. If the container matters, it gets a size off-screen.
- Vercel's `x-forwarded-for` is the visitor's address for `remoteip`. `remoteip` is optional
  to Cloudflare, so a wrong value weakens the check and breaks nothing.

## Revisit when

- Fonnus-BE serves the web voice gateway. It mints the ticket, keeps this budget per caller
  in its own store, and this app's two routes, the cookie, the list call and the three
  variables are deleted. The screen, `VoiceApi.budget()` and the `challenge` on `connect`
  survive if the gateway wants them.
- Usage shows the fresh-budget script of the residual risk. The next steps are the Firewall
  rate-limit rule keyed on IP (one on Hobby, a ten-minute window at most), then a per-IP
  counter in a shared store.
- The agent gets more than 100 conversations an hour. The list call pages, or filters on
  `text_only` and tighter time bounds, or the budget moves to a store.
- F7 writes the Content Security Policy. `script-src` and `frame-src` must allow
  `https://challenges.cloudflare.com`, beside the ElevenLabs hosts of ADR 0006, or the demo
  fails closed after an unrelated deploy.
