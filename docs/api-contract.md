# Fonnus API contract

What the web frontend expects from the backend. Written for a backend engineer who has never
opened this repo.

**Status: proposed, not implemented.** Nothing here exists yet on either side. This document
lives in Fonnus-FE and Fonnus-FE is its authority until `../Fonnus-BE` implements it. The
frontend runs against in-browser mocks (`NEXT_PUBLIC_API_MODE=mock`, the committed default) that implement
exactly these signatures, so the shapes below are already exercised — but no HTTP request has
ever been made. Treat this as a specification to agree on, not a description of a running
system. Where a decision is genuinely open, it is marked and listed in
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
in dev at all.**

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
| Phone format sent | national, digits only, 10 chars: `0914378064` | `auth/phone.ts → normalizePhone` |

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
`ReceptionistConfig` in `src/letan/model.ts` — ~60 fields, named 1:1 with catalogue v1.
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
pack. Those currently live in `src/letan/defaults.ts`, which is the wrong repo for them —
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

---

## 6. Leads

### `POST /leads`

The landing-page contact form. Unauthenticated.

```jsonc
{ "clinic_name": "Nha khoa Minh Anh", "contact_name": "Nguyễn Minh Anh",
  "phone": "0901234567", "source": "landing_contact" }
// → 202
```

Needs bot protection, but **not a CAPTCHA the user must solve** — the form is three fields on
a marketing page and a challenge there costs more leads than it saves. Rate-limit by IP.

---

## 7. Specified later — shape only

These have interfaces in `src/api/` so the UI can be built against them, but no agreed wire
format. Do not implement from this section.

| Surface | Needs | Notes |
|---|---|---|
| **Setup assistant chat** | Streaming (SSE) | Sends a turn, receives interleaved text deltas and structured `Partial<ReceptionistConfig>` patches. The assistant gets exactly the write authority today's canned parser has — it proposes a patch, the client applies it through the same path as a form |
| **Voice session** | WebSocket or WebRTC | Bidirectional audio plus a transcript event stream. The client owns no codec decisions; it toggles a microphone boolean |
| **Landing voice demo** | Cost control **first** | Unauthenticated, and every click costs Deepgram + Qwen + ElevenLabs. Needs a per-IP budget, a max duration and a kill switch before the endpoint exists. See Q21 |
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
