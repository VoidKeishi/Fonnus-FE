# Fonnus API contract

What the web frontend expects from the backend. Written for a backend engineer who has never
opened this repo.

**Status: proposed, not implemented** — except §6, the `leads` group, and the voice demo's
`POST /api/voice-demo/token` in §5, which this app's own route handlers implement
([ADR 0005](./adr/0005-leads-to-google-sheets.md),
[ADR 0006](./adr/0006-elevenlabs-landing-voice-demo.md)). Nothing else here exists yet on
either side. This document lives in Fonnus-FE and Fonnus-FE is its authority
until `../Fonnus-BE` implements it. The frontend runs against in-browser mocks
(`NEXT_PUBLIC_API_MODE=mock`, the committed default) that implement exactly these signatures,
so the shapes below are already exercised — but outside §5's voice session and §6 no HTTP
request has ever been made. The `voice` group of §5 is the one group with no mock: it is
always the ElevenLabs implementation (ADR 0007). Treat everything outside §6 as a specification to agree on, not a description of a
running system. Where a decision is genuinely open, it is marked and listed in
[`open-questions.md`](./open-questions.md).

For how the frontend is wired to swap mocks for real calls, see
[`adr/0003-backend-boundary-and-the-api-seam.md`](./adr/0003-backend-boundary-and-the-api-seam.md).
For field names and their meanings, see
[`field-catalogue-mapping.md`](./field-catalogue-mapping.md) and the frozen
[catalogue v1](./context-field-catalogue.v1.md).

---

## 1. Conventions

### Base path

Every path below is relative to a configurable base (`NEXT_PUBLIC_API_BASE_URL`, default
`/api/v1`). In development the Next.js server rewrites `/api/v1/*` to `API_PROXY_TARGET`
(`next.config.ts`), so the browser only ever talks to `localhost:3000` — **no CORS is involved
in dev at all.** The exceptions are §6 and the voice demo's token in §5: those paths are this
app's own, written in full (`/api/leads…`, `/api/voice-demo/token`) and never under the base.

### Authentication — read this before anything else

The frontend sends `credentials: 'include'` on **every** request and stores no token
anywhere. The session is expected to be an **httpOnly cookie** set by
`POST /auth/otp/verify`.

Two consequences that cause most first-day integration failures:

1. **`Access-Control-Allow-Origin: *` is illegal with credentials.** The backend must echo the
   exact origin and send `Access-Control-Allow-Credentials: true`.
2. **Cookie attributes decide whether this works at all.** Recommendation: deploy the API on a
   subdomain of the same registrable domain as the app — `app.fonnus.vn` ↔ `api.fonnus.vn`.
   They are then *same-site* despite being different origins, so the cookie can stay
   `SameSite=Lax` and no CSRF-token machinery is needed for XHR. An unrelated domain forces
   `SameSite=None; Secure`, which reopens CSRF and requires a double-submit token.

This is an architectural decision worth making deliberately rather than discovering. See Q14.

### Request and response format

- JSON in, JSON out. `Content-Type: application/json` except for file upload.
- **Field names are catalogue `snake_case`, verbatim.** `business_name`, not `businessName`.
  This is the whole reason there is no mapping layer; keeping it means there never has to be one.
- Money is an **integer of VND**, no decimals, no separators: `1500000`.
- Times of day are `"HH:MM"` strings in 24-hour form: `"08:00"`. Dates are ISO `"2027-02-14"`.
  All wall-clock times are Asia/Ho_Chi_Minh. Timestamps are ISO 8601 with offset.
- `null` means "not answered yet" and is distinct from `0` or `""`. `consultation_fee: 0`
  means free; `consultation_fee: null` means nobody has said.

### Errors

Proposed: RFC 9457 `application/problem+json`, with two additions.

```json
{
  "type": "https://api.fonnus.vn/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "code": "validation_failed",
  "errors": [
    { "field": "service_catalog.3.price_from", "code": "must_be_positive" }
  ]
}
```

- `code` — a stable machine string. **The frontend owns every Vietnamese sentence the user
  reads**; a server-authored sentence will not match the voice of the surrounding screen.
  Send codes, not prose.
- `errors[].field` — a dotted path into the record, array indices included. The section forms
  render per-field errors, so they need a path that maps onto an input.

Every response should carry `x-request-id`; the frontend surfaces it in error states so a
support message can name the exact request.

### What the frontend does with each status

| Status | Frontend behaviour |
|---|---|
| `200` / `201` / `202` / `204` | Success. `204` parses as `undefined` |
| `400` / `422` | Field errors highlighted in the form; the save bar stays open with "Thử lại" |
| `401` | **Signs the owner out and redirects to sign-in** — except on `GET /me` and `/auth/*`, where a 401 is a normal answer meaning "anonymous" |
| `403` | Generic error message; no sign-out |
| `404` | Generic error; on `GET /tenant/config` it is treated as "new tenant, seed a template" |
| `409` | "Đã có người khác vừa sửa" + a reload prompt. Requires the concurrency answer in Q8 |
| `429` | Retry-after message. Relevant on OTP send and TTS preview |
| `5xx` | Retryable. GETs retry once automatically; writes never do |
| Network / timeout | Retryable. Client timeout is 15 s; uploads 120 s |

### Idempotency

The client retries `GET` once on a network error, timeout or 5xx. **It never automatically
retries a write.** If the backend wants safe retries on `POST /auth/otp` or
`PATCH /tenant/config`, propose an `Idempotency-Key` header and the frontend will send one.

---

## 2. Auth

The product has **no passwords anywhere**. Three ways in: phone + SMS code, email + emailed
code, and Google OAuth. A number that already has an account silently becomes a sign-in rather
than an error — that is deliberate, and it is the single biggest drop-off in phone-first flows.

Frontend constants the backend must match or override (they are currently hardcoded):

| Constant | Value | Where |
|---|---|---|
| Code length | 6 digits | `auth/OtpField.tsx` |
| Resend cooldown | 42 s | `auth/SignInPage.tsx` |
| Phone format sent | national, digits only, 10 chars: `0914378064` | `api/phone.ts → normalizePhone` |

Only **mobile** prefixes are accepted client-side (`03|05|07|08|09`) — a landline cannot
receive the SMS, so it is rejected before a code that would never arrive.

---

### `POST /auth/otp`

Send a login code by SMS.

```jsonc
// request
{ "phone": "0914378064" }

// 200
{ "existing_account": true }
```

`existing_account` drives the flow: `true` in sign-up turns the screen into a sign-in with a
code instead of showing an error.

> ⚠️ **This is a phone-number enumeration oracle** — anyone can learn whether a number has a
> Fonnus account. It is called out as a deliberate product trade-off rather than an accident,
> because removing it changes a UI flow. See Q16.

Errors: `422 invalid_phone`, `429 otp_rate_limited`.

### `POST /auth/otp/email`

```jsonc
// request
{ "email": "lan@vietsmile.vn" }

// 202 — no body
```

Deliberately does **not** disclose whether the address is registered.

Errors: `422 invalid_email`, `429 otp_rate_limited`.

### `POST /auth/otp/verify`

Verifies a code and **sets the session cookie**.

```jsonc
// request — `identity` is the phone or email the code was sent to
{ "identity": "0914378064", "code": "111002" }

// 200 → Me (see below), plus Set-Cookie
```

Errors, each needing its own Vietnamese copy: `401 otp_invalid`, `401 otp_expired`,
`429 otp_too_many`. See Q17 for the policy behind them.

### `GET /me`

The session probe. Runs once at app boot, before anything renders.

```jsonc
// 200
{
  "identity": "0914378064",
  "method": "phone",
  "display_name": "Nguyễn Lan",
  "clinic_name": "Nha khoa Việt Smile",
  "plan": "Gói Tiêu chuẩn"
}

// 401 — anonymous. A normal answer, NOT a session expiry.
```

`plan` is required: the sidebar renders it today from a hardcoded demo constant, which is a
lie the moment there are two customers.

### `PATCH /me`

```jsonc
// request — both optional
{ "full_name": "Nguyễn Lan", "phone": "0914378064" }

// 200 → Me
```

### `POST /auth/signout`

`204`, and clears the cookie. The frontend also clears its local caches.

### Google OAuth

Currently a fake in-page account chooser; it cannot be real without a client ID. The live path
is a redirect to a normal path: Fonnus-FE routes on real URLs, not fragments (ADR 0003), so the
redirect URI is plainly `https://app.fonnus.vn/app` with nothing to smuggle through a `#`. The
prototype's hash-routing trap, and Q18 which recorded it, no longer apply.

---

## 3. Tenant configuration

The whole Lễ tân tab reads and writes one record. Its full shape is
`ReceptionistConfig` in `src/features/receptionist/model.ts` — ~60 fields, named 1:1 with catalogue v1.
That file is the authoritative schema; this document does not duplicate it, because a copy
would drift.

### `GET /tenant/config`

```jsonc
// 200
{
  "config":  { /* ReceptionistConfig — every field, no partials */ },
  "version": "7",
  "catalogue_version": "v1"
}
```

- `version` — the optimistic-concurrency stamp, echoed back on write. See Q8.
- `catalogue_version` — compared against a constant in `model.ts`; a mismatch logs a loud
  development warning. This is the only defence against silent drift between the two repos.

**A brand-new tenant must come back fully seeded**, with the vertical template already
applied: the dental service rows, the Vietnamese holiday seed including Tết, and the keyterm
pack. Those currently live in `src/features/receptionist/defaults.ts`, which is the wrong repo for them —
if the frontend seeds a new tenant, both repos encode "what a dental clinic looks like" and
they will disagree. See Q11.

### `PATCH /tenant/config`

**One request per section save.** The body is a partial record carrying only the keys that
section owns — between 1 and 11 keys in practice.

```jsonc
// request — the "Địa điểm" section saving
{
  "business_name": "Nha khoa Việt Smile",
  "city": "TP. Hồ Chí Minh",
  "address_full": "123 Lê Lợi, P. Bến Nghé, Quận 1",
  "parking_info": "Gửi xe máy trước cửa"
}

// 200 — the full record back, as GET
{ "config": { /* ... */ }, "version": "8", "catalogue_version": "v1" }
```

**Returning the whole record, not just the changed keys, is a deliberate ask.** It is small,
and it makes row ids and any server-side normalisation reconcile for free. The frontend
applies the response over its optimistic state, so anything the server changed simply appears.

Three worked cases:

**Scalar section** — as above. Straightforward.

**Array section.** `service_catalog` is sent as a complete array; the client always holds and
sends every row.

```jsonc
{
  "service_groups": ["Tổng quát", "Thẩm mỹ", "Chỉnh nha và Implant", "Trẻ em"],
  "service_catalog": [
    { "id": "svc-cao-voi", "service_name": "Cạo vôi răng",
      "service_aliases": ["lấy cao răng"],
      "price_from": 300000, "price_to": 500000, "price_unit": "lan",
      "duration": 30, "service_note": "", "is_bookable": true,
      "from_template": true, "service_group": "Tổng quát" }
  ],
  "pricing_disclosure_policy": "range"
}
```

Rows created in the browser carry a client-generated `id` like `svc-lx3k-4`. **If the server
mints its own ids, the response must contain the full new array** — otherwise the client can
never learn the real ids, and the next save re-sends the client strings and creates duplicate
services. See Q5 and Q6.

**Validation failure.**

```jsonc
// 422
{
  "type": "https://api.fonnus.vn/errors/validation",
  "title": "Validation failed", "status": 422, "code": "validation_failed",
  "errors": [
    { "field": "service_catalog.3.price_from", "code": "must_be_positive" },
    { "field": "escalation_targets.0.phone",   "code": "invalid_phone" }
  ]
}
```

The frontend rolls the optimistic edit back, keeps the save bar open, and highlights those two
inputs. Nothing is lost and the owner can fix and retry.

### `POST /tenant/config/reset`

Back to the vertical template. Behind a confirmation dialog in the UI.

```jsonc
{ "vertical": "nha-khoa" }   // → the same envelope as GET
```

---

## 4. Knowledge files

### `POST /tenant/knowledge-files`

`multipart/form-data`, one `file` part.

Client-side limits already enforced, which the backend should match or correct:
**20 MB**, and `.pdf .doc .docx .xls .xlsx .png .jpg .jpeg`.

```jsonc
// 201
{ "id": "kf_01H...", "name": "banggia2026.pdf", "size": 184320, "status": "queued" }
```

`status` moves `queued → indexed`. **How the client learns of the transition is undecided** —
poll, or push. See Q19.

The UI promises the owner, in writing, that they review every extracted suggestion before the
agent uses it. Any extraction result must therefore be *proposed*, never auto-applied.

### `DELETE /tenant/knowledge-files/{id}` → `204`

---

## 5. Hearing the receptionist: TTS preview and the try-out

### `POST /tts/preview`

Voices one line in the tenant's chosen voice. Today this is the browser's own speech
synthesis, which ignores the chosen voice entirely and is not the product voice.

```jsonc
// request
{ "text": "Việt Smile xin chào...", "voice": "linh", "speed": "normal" }

// 200
{ "url": "https://.../preview/abc.mp3", "duration_ms": 3200,
  "expires_at": "2026-09-03T12:00:00+07:00" }
```

> ⚠️ **Cost.** There is a play button on nearly every configuration section. A naive
> implementation bills ElevenLabs for the same greeting a hundred times in one setup session.
> Cache on a hash of `(text, voice, speed)`. See Q20.

### `POST /receptionist/preview`

The "gọi thử" panel beside every Lễ tân form. One caller line in, the receptionist's reply
out — answered from the record **as sent**, not from the server's copy: the panel exists to
hear an unsaved edit, so the request carries the whole draft.

```jsonc
// request
{
  "text": "Mai mấy giờ mở cửa?",
  "history": [ { "role": "caller", "text": "Alo" }, { "role": "agent", "text": "Dạ, em là Linh…" } ],
  "section": "gio-mo-cua",          // which sub-page the panel sits on; a hint, not a filter
  "config": { /* ReceptionistConfig, draft fields included */ }
}

// 200
{
  "text": "Mai thứ Bảy phòng khám mở từ 08:00 đến 20:00, nghỉ trưa 12:00 đến 13:30 ạ.",
  "audio": { "url": "https://.../preview/def.mp3", "duration_ms": 4100 }   // or null
}
```

`text: "[im lặng]"` is the caller saying nothing: reply with the silence nudge
(`silence_nudge_script`), or the closing line once `end_call_after_n_nudges` is reached.
`audio` may be null — the client then voices `text` through `POST /tts/preview`, or the
browser's own Vietnamese voice as a last resort. Today the reply comes from intent matching in
the browser (`src/api/receptionist.mock.ts`); live it is the same model that takes real calls,
reading the same record, so what the owner hears here is what a caller will hear.

> Same cost note as TTS: the owner will ask the same three questions twenty times while
> editing one price. Cache replies on a hash of `(text, history, config)`.

### The voice session (client seam)

Not an HTTP endpoint: the interface the landing page's "Nghe thử" call screen talks to, the
`voice` group in `src/api/contracts.ts`. Whatever carries the audio sits behind it, so the
screen and its hook never change when the transport does.

`api.voice.connect({ mode: 'landing-demo', input, signal, challenge })` resolves a
`VoiceSession`. `input` is `voice` (a call) or `text` (the same conversation typed, for a browser
that gives no microphone). The caller invokes `connect` inside the tap that started the call,
because the microphone prompt needs that gesture. The session's cap is not the caller's to pass:
it comes with the ticket ([ADR 0009](./adr/0009-voice-demo-budget-on-the-server.md) point 4).

`challenge(signal)` resolves the proof the ticket route asks for, a Cloudflare Turnstile token
(ADR 0009 point 5). `connect` calls it when the route is about to be called — after the microphone
grant for a call, first thing for a text session — under the connection budget, whose signal it
is handed. A rejection, or no answer within the budget, rejects `connect` with
`voice_unavailable`. It may be called by both attempts of one tap, the call and the text session
after a refused microphone, and each call must hand out a token no earlier one returned: a token
returned is taken as spent. Since the call asks for the microphone before the proof, a refused
microphone leaves the tap's one unused token to the text session. On the landing page it is the
call screen's Invisible widget: Cloudflare's script loads from its exact URL and the widget is
rendered when the consent slot opens, beside the budget read and never with the page, so the
widget is ready by the time the visitor taps and the tap only runs the challenge.

`api.voice.budget({ signal })` resolves a `VoiceBudget`, `{ remaining_ms, resets_at }`: where the
visitor's hour stands, read from whoever mints the ticket and never kept by the client.
`remaining_ms` is what is left of the three minutes; `resets_at` is when the full budget is back,
in epoch milliseconds, and `null` while the full budget is there.

The session has:

| Member | What it does |
|---|---|
| `budget` | The `VoiceBudget` the ticket's answer carried: what this session may spend, and when the hour is back |
| `endsAt` | When the session's cap ends it, in epoch milliseconds, set as the cap's timer starts and never moved. The call screen counts down to it under its title, `2:39 / 3:00`, while the session runs ([ADR 0010](./adr/0010-voice-demo-countdown.md)) |
| `subscribe(listener)` | Delivers events and returns the unsubscribe. A new listener is first handed, synchronously, every `message` so far and then the latest of the other events. Nothing is delivered after `close()` resolves |
| `setMicEnabled(on)` | The screen's entire microphone surface. The session owns `getUserMedia` and everything downstream of it. A no-op in a text session |
| `sendText(text)` | A chip or a typed line. A text session also emits it back as the visitor's `message` |
| `noteActivity()` | The visitor is typing a line not yet sent. The screen calls it on every change to the typed box, in both inputs, so the agent's turn timeout does not end the conversation while the visitor types; the live session forwards it to the SDK's `sendUserActivity()`, which throttles it. Inert once the session has ended |
| `getAmplitude()` | Output loudness `0..1`, or `null` when silent. Polled by the orb on every animation frame, never pushed as an event. Always `null` in a text session |
| `close()` | Idempotent. Emits `ended { reason: 'user' }` once, unless the session had already ended |

Events are only what the screen reads:

- `{ type: 'state', state }`, with `state` ∈ `connecting` · `speaking` · `listening`. In a call
  the line under the orb says "Đang kết nối…" while connecting and, after that, only "Micro đang
  tắt — bạn có thể gõ chữ" while the microphone is off: `speaking` and `listening` come from the
  SDK's mode change, which lags her voice, so the line never names them, and the orb's
  movement with `getAmplitude()` shows her speaking. In a text session
  `speaking` means her reply is on its way and `listening` that she waits for the visitor:
  "Đang kết nối…", "Linh đang trả lời…", "Linh đang chờ bạn nhắn".
- `{ type: 'message', from, text }`, with `from` ∈ `agent` · `visitor`: one line of a text
  session, in order. A call sends none: the voice screen shows no transcript.
- `{ type: 'ended', reason }`, with `reason` ∈ `user` (the visitor closed it) · `agent` (the
  receptionist ended the call) · `timeout` (the duration cap) · `error` (anything else).

There is no voice choice: the screen shows none.

One implementation stands behind the interface, and there is no mock
([ADR 0007](./adr/0007-voice-demo-agent-only-and-text-fallback.md)): a faked conversation is a
recording, and the demo answers with the agent or not at all. `voice` is therefore not in
`API_GROUPS`, and `NEXT_PUBLIC_MOCK_FAILURE_RATE` does not reach it; its error paths are reached
by unsetting `ELEVENLABS_API_KEY` (the `503` of both routes below) and by the unit tests of
`voice.live.ts`. That **live implementation** is the ElevenLabs session of
[ADR 0006](./adr/0006-elevenlabs-landing-voice-demo.md), not Fonnus-BE's: the browser connects
to a private ElevenLabs agent with a ticket this app mints (below) — a conversation token and
WebRTC for a call, a signed URL and a WebSocket for a text session.
`@elevenlabs/client` is imported inside `connect`, so it loads on the first call and never with
the page. What the client does:

- **Consent first.** The call screen opens on one line saying what happens to what the visitor
  says or types, and one button, "Bắt đầu gọi"; `connect` runs inside that tap, never on the orb
  click (ADR 0006 point 8). The line names both inputs, because it is shown before the browser
  has answered about the microphone.
- **Microphone before token, for a call.** With `input: 'voice'`, `connect` asks for the
  microphone first and releases the stream at once (the SDK opens its own), so no token is
  minted for a visitor who refuses. Then it asks `challenge` for the proof, posts
  `{ "turnstile_token": "…" }` to `POST /api/voice-demo/token`, loads the SDK and starts the
  session.
- **No microphone, same agent.** With `input: 'text'`, `connect` skips the microphone, asks
  `challenge` for the proof, posts `{ "input": "text", "turnstile_token": "…" }` to the same route
  for a signed URL, and starts the SDK's text-only
  conversation over a WebSocket (`signedUrl`, `connectionType: 'websocket'`, `textOnly: true`).
  Not WebRTC: there the SDK joins the room in voice, plays every agent audio track whatever
  `textOnly` says, and sends the text-only override only after joining, so the agent speaks,
  never hears the typed lines and ends on its turn timeout. Over the WebSocket the override goes
  out as the socket opens, before the conversation starts, and no audio is created. The agent's
  replies arrive as `message` events.
- **Two codes of its own.** Besides whatever `http.ts` makes of the token route's answer,
  `connect` rejects with `ApiError { kind: 'unknown', code }`: `microphone_unavailable` when
  `input` is `voice` and the browser gives no microphone for any reason (`getUserMedia` refused
  by the visitor or the page's permissions, no microphone, a busy one, or no media API at all in
  an insecure context), and `voice_unavailable` when `challenge` gives no proof, the SDK fails
  to load or to start, or the proof, the token, the SDK and the connection together take more
  than **fifteen seconds**, counted from the microphone grant for a call and from `connect` for a
  text session. Neither code is ever
  rendered through `messageFor`.
- **What the screen does with a rejection.** `microphone_unavailable` makes the hook connect
  again with `input: 'text'`, inside the same tap and without a second consent; the screen then
  shows the typed shape: a smaller orb, the line "Không dùng được micro trên thiết bị này, nên
  bạn nhắn và Linh trả lời bằng chữ.", the thread, the chips and the typed line without the
  microphone toggle. Every other rejection, of either attempt, is a failed call: "Không kết nối
  được với Linh lúc này. Bạn thử gọi lại sau một lát." and "Gọi lại", with no sign-up link.
  Nothing stands in for the agent.
- **A cap of 180 seconds at most**, under the agent's own 190, so the ending is the app's: the
  session emits `ended { reason: 'timeout' }` and closes itself at `endsAt`. The cap is the ticket's
  `remaining_ms`, what is left of the visitor's three minutes an hour, when that is shorter
  ([ADR 0008](./adr/0008-voice-demo-three-minutes-an-hour.md)). The hour is counted on the
  server, by the route that mints the ticket ([ADR 0009](./adr/0009-voice-demo-budget-on-the-server.md));
  the client reads it and never keeps it. It applies to a text session unchanged.
- **Where the hour stands, on the screen.** The consent slot opens at once with its one line, and
  `budget()` runs as it opens: its answer adds "Giờ này bạn còn … gọi thử." when part of the hour
  is spent, or swaps the slot for its spent shape when nothing is left. A read that fails leaves
  the slot as it is, and the tap gets the real answer: a `budget_spent` refusal (kind
  `ratelimited`) sends the screen back to the consent slot in its spent shape, with `resets_at`
  from a second `budget()`, since `http.ts` keeps a refusal's `code` and nothing else; if that
  read fails too, the call is shown as failed. An ending on `timeout` is spent by construction and
  takes its `resets_at` from `session.budget`; an `agent` or `error` ending keeps "Gọi lại" and
  reads `budget()` once, five seconds after the call, whose answer may drop it. ElevenLabs lists
  a call as `in-progress` for a few seconds after hang-up, so a read at once would still see the
  ticket's full charge. For the same reason a read after a `budget_spent` refusal that answers
  "spent" is made once more five seconds later. A budget read still going when a ticket is asked
  for is dropped.
- **Endings.** `agent` (the receptionist hung up) shows a closing line with "Vào danh sách chờ"
  (to `/waitlist`) and "Gọi lại"; `error` (the connection dropped after the call started) shows
  "Mất kết nối với Linh." and "Gọi lại". `timeout` means the hour is spent: its line says when
  the next call can start, and it offers "Vào danh sách chờ" only. An `agent` or `error` ending
  that spent the rest of the hour says the same, drops "Gọi lại" and offers "Vào danh sách chờ"
  (for `error` too: the visitor has had their three minutes with Linh, ADR 0008 point 5). The
  wait it names is as of the answer that said it; it is not counted down, and the slot reads
  `budget()` again at `resets_at` and turns back into its ordinary shape when the hour does. "Gọi lại" connects again, a call first,
  without a second consent. `user` is the visitor closing the screen and shows nothing.
- **Loudness.** `getAmplitude()` is the agent's output volume while she speaks in a call, and
  `null` otherwise, in a text session, or once the session has ended. The orb and the dotted field
  behind it move only on a number; on `null` they rest, so a typed conversation has no voice
  animation.
- **The agent's own cap.** When ElevenLabs ends the call at its 190 s `max_duration_seconds`
  before the client's own timer does, the disconnect arrives as an error with the context
  `max_duration_exceeded`; the session reports it as `timeout`, not `error`.

When Fonnus-BE serves a web voice gateway into the pipeline, it implements this same interface
in `voice.live.ts` and the token route is deleted.

### The visitor's hour: the `voice_demo_budget` cookie

The two routes below keep the visitor's three minutes an hour in one cookie they write and no
script can read ([ADR 0009](./adr/0009-voice-demo-budget-on-the-server.md)):
`voice_demo_budget`, `HttpOnly`, `Secure` in production (not in development, which a phone on
the LAN reaches over plain http), `SameSite=Lax`, `Path=/api/voice-demo`, and a
`Max-Age` that ends with the hour. It holds the window's opening time and one entry per ticket
minted in it, and is signed with HMAC-SHA256 under `VOICE_DEMO_COOKIE_SECRET`; a cookie that does
not verify, does not parse, or names an hour that has ended reads as no cookie, which is the full
budget. The window is fixed: it opens with the first ticket and the full budget is back an hour
later.

- **Charged first, refunded from ElevenLabs.** A ticket is charged the whole remainder when it is
  minted. Every read lists the agent's conversations started since the window opened and
  re-charges each ticket's conversation at its real `call_duration_secs` once its `status` is
  `processing`, `done` or `failed`; one still `initiated` or `in-progress` stays charged in full,
  and a ticket whose conversation has not appeared fifteen minutes after it was minted is
  refunded entirely — only when the one page of 100 holds the whole list (`has_more` is
  `false`), since a row missing from an incomplete page may only be off it. When the list call
  fails, the charges stand as they were.
- **Unauthenticated.** This cookie is the only one read, and a `401` is never answered.

### `GET /api/voice-demo/budget`

**Not Fonnus-BE's.** This app's own route handler, beside the token route below. Where the
visitor's hour stands, for the call screen to say.

```jsonc
// → 200, Cache-Control: no-store, Set-Cookie: voice_demo_budget=… when a refund changed it
{ "remaining_ms": 135000, "resets_at": 1792288800000 }   // part of the hour spent
{ "remaining_ms": 180000, "resets_at": null }            // the full budget
```

No body is read, and no Turnstile token is asked for: the read mints nothing. The cookie is
written back only when settling changed a charge, so a refund is kept and a read can never
overwrite the cookie a ticket's answer has just set.

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "remaining_ms", "resets_at" }`, `Cache-Control: no-store` | Where the hour stands, settled against ElevenLabs's list when the list answered, and as charged when it did not |
| `503` | — | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `VOICE_DEMO_COOKIE_SECRET` or `TURNSTILE_SECRET_KEY` is not set |

### `POST /api/voice-demo/token`

**Not Fonnus-BE's.** This app's own route handler, on this app's origin and outside
`/api/v1`, like §6. It mints the ticket the live voice session hands to ElevenLabs, using a key
that never reaches the browser: a WebRTC conversation token for a call, a WebSocket signed URL
for a text session. Each comes with what the ticket may spend of the visitor's hour, which the
session caps itself on.

```jsonc
// request, a call — Content-Type: application/json
{ "turnstile_token": "<Turnstile token>" }    // `"input": "voice"` may be added
// → 200, Cache-Control: no-store, Set-Cookie: voice_demo_budget=…
{ "token": "<WebRTC conversation token>", "remaining_ms": 180000, "resets_at": 1792288800000 }

// request, a text session
{ "input": "text", "turnstile_token": "<Turnstile token>" }
// → 200, Cache-Control: no-store, Set-Cookie: voice_demo_budget=…
{ "signed_url": "wss://…", "remaining_ms": 180000, "resets_at": 1792288800000 }

// nothing of the hour left
// → 429, Content-Type: application/problem+json, Cache-Control: no-store
{ "code": "budget_spent", "resets_at": 1792288800000 }
```

- **A solved challenge first.** `turnstile_token` is checked before anything else the route asks
  of anyone (below); without an accepted one there is no ticket, and no conversation list is read.
- **The visitor's hour decides.** The cookie above is read and settled next; with nothing left
  the route answers `429` and mints nothing. `remaining_ms` in a `200` is what this ticket is
  charged, the whole remainder, and `resets_at` is when the full budget is back.
- **The request must be `Content-Type: application/json`,** even for a call's empty body, so
  that another site cannot make a visitor's browser mint a ticket with a simple,
  preflight-free request; the route sends no CORS headers.
- **`input` is `voice` or `text`, or absent.** Absent is a call, which is what the live session
  sends for one. Any other value, or a body that is not a JSON object, is a `400`.
- **`turnstile_token` is required**, a non-empty string; missing, empty or of another type, the
  route answers `403` and asks neither Cloudflare nor ElevenLabs anything.
- **Never upstream text.** A refusal has no body but the `429`'s code, and nothing ElevenLabs
  or Cloudflare said reaches the response.

**The Turnstile check** ([ADR 0009](./adr/0009-voice-demo-budget-on-the-server.md) point 5). The
route sends one `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`, JSON, under the
same 8-second deadline as the rest: `secret` (`TURNSTILE_SECRET_KEY`), `response` (the token),
`idempotency_key` (a fresh UUID) and `remoteip`, the first address of `x-forwarded-for`, when the
request carries one. Nothing else about the visitor is sent. A token validates once and lasts 300
seconds, so a spent or stale one is refused (`timeout-or-duplicate`). It fails closed: a refused
token is a `403`, and Cloudflare not answering, answering a non-2xx, or answering without a
boolean `success` is a `502` — no ticket either way. The log line names the step and Cloudflare's
status, or for a refusal Cloudflare's `error-codes`; never the token or the secret.
`GET /api/voice-demo/budget` needs no token.

Every refusal makes `connect` reject. The `429` turns the call screen to its spent consent slot
(above); every other one makes it say it could not connect to Linh and offer to call again
([ADR 0007](./adr/0007-voice-demo-agent-only-and-text-fallback.md) point 5).

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "token": "…" }` or `{ "signed_url": "…" }`, each with `remaining_ms` and `resets_at`, `Cache-Control: no-store`, the cookie set | A call's token, valid for fifteen minutes, or a text session's signed URL, requested with `include_conversation_id=true` so that it opens one conversation and no more |
| `400` | — | The body is not a JSON object, or `input` is neither `voice` nor `text` |
| `403` | — | `turnstile_token` is missing, or Cloudflare refused it: spent, expired, or never solved. Nothing upstream is asked after it, and no cookie is written |
| `413` | — | The body is over 48 KiB, the cap the `leads` routes share |
| `415` | — | Not `application/json` |
| `429` | `{ "code": "budget_spent", "resets_at" }`, `application/problem+json` | Nothing of the visitor's hour is left. No ticket is minted |
| `429` | — (from the Vercel Firewall) | Too many tokens from this IP, should a Firewall rule be set |
| `502` | — | ElevenLabs refused either ticket, or Cloudflare's siteverify failed, or either did not answer within the 8-second deadline, which siteverify, the conversation list and the mint share. Nothing is charged and the cookie is not written |
| `503` | — | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `VOICE_DEMO_COOKIE_SECRET` or `TURNSTILE_SECRET_KEY` is not set. Unsetting the key is the kill switch |

---

## 6. Leads

**This group is not Fonnus-BE's.** This app's own route handlers receive the three marketing
forms — the contact form, the hotline report request and the waitlist — and append each to its
own tab of one Google Sheet (`leads`, `hotline_report`, `waitlist`;
[ADR 0005](./adr/0005-leads-to-google-sheets.md);
`src/app/api/leads/…`, `src/server/`). The paths below are on the app's own origin, outside
`/api/v1`, and are not under `NEXT_PUBLIC_API_BASE_URL`: `leads.live.ts` calls them with
`http.ts`'s `ownOrigin` option.

What every endpoint shares:

- **Unauthenticated.** No cookie is read, a `401` is never answered, and nothing here signs
  anyone out (`expect401`).
- **The request must be `Content-Type: application/json`** (parameters such as `charset`
  aside), or the answer is `415`. A form-encoded or `text/plain` post is one any other site can
  make a visitor's browser send without a CORS preflight; JSON forces the preflight, and the
  routes send no CORS headers.
- **The body is at most 48 KiB (49,152 bytes)**, or the answer is `413`. The fullest hotline
  report the caps below allow is about 33 KB of compact JSON when every character is three
  bytes, so no valid submission comes near it.
- **Text caps**, measured in UTF-16 units on the trimmed text — the numbers in
  `src/api/lead-limits.ts`, which the forms also put on their inputs as `maxLength`: 200 for
  `clinic_name` and `contact_name`, 254 for `email`, 500 for a location's `address`. Past a
  cap the field is refused with `too_long`.
- **Bot protection is a per-IP rate limit at the host's firewall**, which answers `429`
  before the handler runs. **No CAPTCHA the user must solve** — a challenge on a marketing
  form costs more leads than it saves.
- **Google failing is a `503`, never retried** by the handler or the frontend: the visitor
  keeps what they typed and sends again. So is a deployment missing its Google
  configuration. The handler answers within 12 seconds, under the frontend's 15-second
  timeout.
- Refusals other than `422` have no body, and no response carries `x-request-id`.
- `source` is sent by the frontend and ignored by the handler, as is any other extra key.

The frontend behaviour below is what `http.ts` and `errors.ts` render: `kindForStatus` maps
`413` and `415` to `unknown` and `400` to `validation`; a validation error naming no field of
the form, and an `unknown` one, both show "Có lỗi xảy ra. Bạn thử lại giúp mình nhé." under
the button.

### `POST /api/leads`

The landing-page contact form.

```jsonc
{ "clinic_name": "Nha khoa Minh Anh", "contact_name": "Nguyễn Minh Anh",
  "phone": "0901234567", "source": "landing_contact" }
// → 202
```

`phone` is national form, digits only, and is any number the clinic can be called back on —
not only a mobile: a mobile (`0901234567`, 10 digits), a fixed line (`02838221234`, 11 digits
starting `02`) or a 1800/1900 hotline (`19001234` or `1800123456`, 8 or 10 digits, sent as
typed with no leading `0`). The frontend normalizes and checks it before sending
(`api/phone.ts → normalizeCallbackNumber`, `isValidCallbackNumber`); the server checks again
and stores the normalized form. `clinic_name` and `contact_name` arrive trimmed and non-empty.

A `202` means one row was appended to the sheet's `leads` tab.

| Status | Body | Frontend behaviour |
|---|---|---|
| `202` | — | The form is replaced by "Đã nhận thông tin" |
| `400` | — (the body is not JSON) | "Có lỗi xảy ra. Bạn thử lại giúp mình nhé." under the button; what was typed stays |
| `413` | — (the body is over 48 KiB) | The same line |
| `415` | — (not `application/json`) | The same line |
| `422` | `code: "validation_failed"`, `errors[].field` ∈ `clinic_name` · `contact_name` · `phone`, in that order; `errors[].code` ∈ `required` · `invalid_phone` · `too_long` | The line for that field appears under it, as if the frontend had caught it: on a name, whatever the code, the name's "Nhập …" line. The inputs' `maxLength` keeps `too_long` from being reached by typing or pasting; a browser that counts grapheme clusters, or an extension that sets the value directly, can still exceed it, and the form then shows that "Nhập …" line. On the phone, "Nhập số điện thoại…" for `required`, "Số này chưa đúng…" otherwise. A field outside the three is ignored; when no known field is named, the generic line shows under the button |
| `429` | — (from the firewall) | "Bạn thao tác hơi nhanh. Đợi một chút rồi thử lại nhé." under the button; what was typed stays |
| `503` | — (Google failed, or the deployment has no Google configuration) | "Máy chủ đang gặp sự cố. Bọn mình đang xử lý — bạn thử lại sau ít phút nhé." under the button; what was typed stays. Never retried automatically |
| network / timeout | — | The matching message under the button; what was typed stays |

### `POST /api/leads/hotline-report`

The "Chấm điểm hotline" page (`/cham-diem-hotline`): a clinic asks Fonnus to ring its
published numbers as a patient would and email it a scored report.

```jsonc
{ "contact_name": "Nguyễn Minh Anh", "email": "anh@nhakhoaminhanh.vn",
  "clinic_name": "Nha khoa Minh Anh",
  "locations": [
    { "address": "12 Nguyễn Trãi, Quận 1, TP.HCM", "phone": "02838221234" },
    { "address": "45 Lê Lợi, Quận 3, TP.HCM", "phone": "19001234" }
  ],
  "source": "hotline_report" }
// → 202
```

`locations` holds at least one and at most 20 entries (`MAX_LOCATIONS`), in the order the form
lists them. Each `phone` is national form, digits only, under the same rule as
`POST /api/leads`: a mobile, a fixed line, or a 1800/1900 hotline sent as typed with no
leading `0` (`api/phone.ts → normalizeCallbackNumber`, `isValidCallbackNumber`).
`contact_name`, `clinic_name` and every `address` arrive trimmed and non-empty; `email`
arrives trimmed and passes `isValidEmail`. The server checks all of it again and stores the
numbers normalized.

A `202` means one row per location was appended to the sheet's `hotline_report` tab, in one
request, each row carrying the same received time and a request id generated by the handler.

| Status | Body | Frontend behaviour |
|---|---|---|
| `202` | — | The form is replaced by "Đã nhận yêu cầu", naming the email and the number of locations |
| `400` | — (the body is not JSON) | "Có lỗi xảy ra. Bạn thử lại giúp mình nhé." under the button; what was typed stays |
| `413` | — (the body is over 48 KiB) | The same line |
| `415` | — (not `application/json`) | The same line |
| `422` | `code: "validation_failed"`, `errors[].field` ∈ `contact_name` · `email` · `clinic_name` · `locations` · `locations.<i>.address` · `locations.<i>.phone` (`<i>` zero-based, in the order sent), in form order: the person's fields, then each location's address and phone, location by location; `errors[].code` ∈ `required` · `invalid_email` · `invalid_phone` · `too_long`. The bare `locations` field means the list itself: `required` when it is missing, not an array or empty, `too_long` past 20 — and its rows are then not checked | The page's own line for that field appears under it — on the email, "Email này chưa đúng…" for any code but `required`; on a phone, "Số này chưa đúng…" for any code but `required`; otherwise the "Nhập …" line. The inputs' `maxLength` keeps `too_long` from being reached by typing or pasting; a browser that counts grapheme clusters, or an extension that sets the value directly, can still exceed it, and the form then shows the field's "Nhập …" line (on the email, its "Email này chưa đúng…" line). A line for a `locations.<i>` path lands on the i-th location's row, and the first one in form order takes the focus. The bare `locations` field and any field outside these are ignored; when no known field is named, the generic line shows under the button. What was typed stays |
| `429` | — (from the firewall) | "Bạn thao tác hơi nhanh. Đợi một chút rồi thử lại nhé." under the button; what was typed stays |
| `503` | — (Google failed, or the deployment has no Google configuration) | "Máy chủ đang gặp sự cố. Bọn mình đang xử lý — bạn thử lại sau ít phút nhé." under the button; what was typed stays. Never retried automatically |
| network / timeout | — | The matching message under the button; what was typed stays |

### `POST /api/leads/waitlist`

The waitlist page (`/waitlist`): a clinic leaves who to ring when its turn comes, and where to
send the setup guide.

```jsonc
{ "contact_name": "Nguyễn Thị Lan", "phone": "02838221234",
  "email": "lan@phongkham.vn", "source": "waitlist" }
// → 202
```

`phone` is national form, digits only, under the same rule as `POST /api/leads`: a mobile, a
fixed line, or a 1800/1900 hotline sent as typed with no leading `0`
(`api/phone.ts → normalizeCallbackNumber`, `isValidCallbackNumber`). `contact_name` arrives
trimmed and non-empty; `email` arrives trimmed and passes `isValidEmail`. The server checks all
of it again and stores the number normalized.

A `202` means one row was appended to the sheet's `waitlist` tab.

| Status | Body | Frontend behaviour |
|---|---|---|
| `202` | — | The form is replaced by "Bạn đã có tên trong danh sách.", naming the number and the email, and the night panel gains the visitor's "Đã giữ chỗ" row |
| `400` | — (the body is not JSON) | "Có lỗi xảy ra. Bạn thử lại giúp mình nhé." under the button; what was typed stays |
| `413` | — (the body is over 48 KiB) | The same line |
| `415` | — (not `application/json`) | The same line |
| `422` | `code: "validation_failed"`, `errors[].field` ∈ `contact_name` · `phone` · `email`, in that order; `errors[].code` ∈ `required` · `invalid_phone` · `invalid_email` · `too_long` | The line for that field appears under it, as if the frontend had caught it: on the name, whatever the code, "Nhập họ và tên của bạn."; on the phone, "Nhập số điện thoại…" for `required`, "Số này chưa đúng…" otherwise; on the email, "Nhập email…" for `required`, "Email này chưa đúng…" otherwise. The inputs' `maxLength` keeps `too_long` from being reached by typing or pasting. A field outside the three is ignored; when no known field is named, the generic line shows under the button |
| `429` | — (from the firewall) | "Bạn thao tác hơi nhanh. Đợi một chút rồi thử lại nhé." under the button; what was typed stays |
| `503` | — (Google failed, or the deployment has no Google configuration) | "Máy chủ đang gặp sự cố. Bọn mình đang xử lý — bạn thử lại sau ít phút nhé." under the button; what was typed stays. Never retried automatically |
| network / timeout | — | The matching message under the button; what was typed stays |

---

## 7. Specified later — shape only

These have interfaces in `src/api/` so the UI can be built against them, but no agreed wire
format. Do not implement from this section.

| Surface | Needs | Notes |
|---|---|---|
| **Setup assistant chat** | Streaming (SSE) | Sends a turn, receives interleaved text deltas and structured `Partial<ReceptionistConfig>` patches. The assistant gets exactly the write authority today's canned parser has — it proposes a patch, the client applies it through the same path as a form |
| **Voice session** | WebSocket or WebRTC | Bidirectional audio plus a transcript event stream. The client owns no codec decisions; it toggles a microphone boolean |
| **Landing voice demo** | Decided for the stand-in | Unauthenticated. Until Fonnus-BE has a web voice gateway, the demo talks to an ElevenLabs agent with a token from this app (§5, [ADR 0006](./adr/0006-elevenlabs-landing-voice-demo.md)). Each browser has three minutes an hour, kept in the signed cookie of [ADR 0009](./adr/0009-voice-demo-budget-on-the-server.md); the duration cap and the kill switch are in Q21's answer, and the gateway inherits all three. A Vercel Firewall rate-limit rule is deferred to the backlog |
| `GET /calls` | — | The "Cuộc gọi" tab, currently a placeholder |
| `GET /appointments` | — | The "Lịch hẹn" tab |
| `GET /numbers` | — | FPT inventory pool for number provisioning; sets `assigned_phone` |

---

## 8. Open questions

The decisions above that are genuinely open are collected in
**[`open-questions.md`](./open-questions.md)**, one per line, written so the list can be sent
to the backend team and struck through as answers arrive.

Several are cheap to answer now and expensive to discover later — particularly **Q1** (is the
wire format really catalogue snake_case?), **Q5** (who owns row ids?), **Q8** (concurrency),
and **Q10** (one owner, one clinic?).
