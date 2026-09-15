# Open questions for the backend team

Decisions the frontend cannot make alone. Each is cheap to answer now and expensive to
discover later.

This file is meant to be **sent as-is** and answered in place — fill in the *Answer* line and
strike the question through. Anything still open is a thing the frontend is guessing about.

Format: **Q** — the question · *Why it matters* · **Recommendation** where there is one.

---

## Wire format

### Q1 · Is the request body literally catalogue `snake_case`, at the top level, unwrapped?

*Why:* `src/letan/model.ts` already names every field exactly as catalogue v1 does. If the
wire format matches, **there is no mapping layer to build, ever** — the record the UI edits is
the record the backend stores. If it does not, every field needs a translation function on
both sides, forever, and each new field is two edits instead of one.

**Recommendation:** yes, bare `snake_case`, no `{ config: ... }` wrapper on the request.
(The *response* is wrapped, because it carries `version` alongside.)

**Answer:**

---

### Q2 · Does `PATCH /tenant/config` accept an arbitrary subset of keys?

*Why:* Each of the 15 built sections saves only the keys it owns — between 1 and 11 of them.
If the backend requires a fixed group per request, the section boundaries in the UI have to be
redrawn to match.

**Recommendation:** accept any subset.

**Answer:**

---

### Q3 · What happens to `[ext]` fields the backend does not know?

*Why:* Eleven fields are frontend inventions not in catalogue v1 — `agent_name`,
`escalation_window`, `greeting_by_daypart`, `email_rules`, the two `*_confirmed` flags, and
some row-level columns. Full list with a suggested resolution for each in
[`field-catalogue-mapping.md`](./field-catalogue-mapping.md).

Three options: store them (a `ui_state` JSONB column), accept and ignore them, or reject with
`400`. **Rejecting breaks six of the fifteen sections on day one**, so if that is the answer
the frontend needs to know before it starts sending them.

**Recommendation:** store them, echo back what was stored.

**Answer:**

---

### Q4 · What does a successful `PATCH` return — the changed keys, the whole record, or `204`?

*Why:* The client applies the response over its optimistic state. The whole record makes ids
and any server normalisation reconcile for free; `204` means the client can never learn what
the server actually stored.

**Recommendation:** the whole record. It is a few KB and it removes a class of bug.

**Answer:**

---

## Array rows

Applies to `service_catalog`, `practitioner_roster`, `holiday_exceptions`, `faq_pairs`,
`keyterms`, `branch_list`, `break_periods`, `escalation_targets`, `package_bundles`,
`active_promotions`.

### Q5 · Does the server accept client-generated row ids, or mint its own?

*Why:* `newId()` produces strings like `svc-lx3k-4` in the browser, and `model.ts:343`
currently says *"the server replaces them on save"*. If it does replace them, **the PATCH
response must contain the full new array** — otherwise the form never learns the real ids, the
next save re-sends the client strings, and depending on Q6 that creates twelve duplicate
services.

**Recommendation:** either is fine, but say which. Accepting client ids is simpler; if so, the
frontend switches `newId()` to `crypto.randomUUID()` so collisions are impossible.

**Answer:**

---

### Q6 · Are array fields replaced wholesale, or merged row by row?

*Why:* The UI always holds and sends the complete array — a merge protocol would need a
delete verb that no UI element produces. But wholesale replacement means two people editing
the service list at the same time will clobber one another, which makes Q8 load-bearing.

**Recommendation:** wholesale replacement per array field, with Q8's version check as the
guard against concurrent loss.

**Answer:**

---

### Q7 · Who computes the derived values — `is_open_now`, derived `keyterms`, and the R1/R2 readiness gates?

*Why:* All three are computed in the browser today (`readiness.ts`, `KeytermsSection.tsx`).
The pipeline needs the same answers: `is_open_now` gates booking versus after-hours
behaviour, and readiness decides whether an agent may go live at all. Two implementations in
two languages will not agree forever, and the disagreement will show up as an agent that
books appointments while the clinic is shut.

**Recommendation:** the backend is authoritative for all three and returns them in
`GET /tenant/config`. The frontend keeps a local `is_open_now` purely for an indicator that
updates without a request, clearly marked as cosmetic.

**Answer:**

---

## Concurrency

### Q8 · Does the tenant record carry a `version` or `updated_at`, and does `PATCH` check it?

*Why:* One record is written by the section forms, the question rail, the setup assistant, two
browser tabs, and potentially two staff members on two laptops. Without a check, the last
writer silently wins and the other person's work vanishes with no error.

**Recommendation:** a `version` string in the envelope, echoed on write, `409` on mismatch.
The frontend already has a `conflict` error kind and Vietnamese copy for it, and will show a
reload prompt.

**Answer:**

---

## Errors

### Q9 · Error body shape, and are field paths dotted with array indices?

*Why:* The section forms render per-field errors, so they need a path that maps onto an input:
`service_catalog.3.price_from`.

**Recommendation:** RFC 9457 `problem+json` with an `errors: [{ field, code }]` array, and
**machine codes rather than Vietnamese sentences** — the frontend owns all user-facing copy,
and a server-authored sentence will not match the voice of the surrounding screen. Example in
[`api-contract.md`](./api-contract.md) §1.

**Answer:**

---

## Tenancy and ownership

### Q10 · One owner ↔ one clinic, or can an owner hold several?

*Why:* **The most expensive question here to get wrong.** The entire UI — sidebar, routing,
config store, readiness meter — assumes exactly one tenant per signed-in owner. Multi-clinic
support means a tenant switcher, a tenant id in every path, and a re-think of the app shell.
Multi-branch is already handled inside one tenant via `branch_list`; this question is about
genuinely separate clinics under one login.

**Recommendation:** confirm one-to-one for the pilot and say so explicitly, so the assumption
is a decision rather than an accident.

**Answer:**

---

### Q11 · Where does the vertical template live once the backend owns it?

*Why:* `src/letan/defaults.ts` currently holds the 12 dental service rows, the Vietnamese
holiday seed including Tết, and the keyterm pack — 359 lines of "what a dental clinic looks
like" sitting in the frontend. If the backend also seeds new tenants, both repos encode it and
they will drift.

**Recommendation:** the backend owns it. `GET /tenant/config` on a fresh tenant returns a
fully-seeded record, and `defaults.ts` survives only as the mock fixture and an offline
fallback. Follow-on: what do `from_template` and `seeded` mean once the server sets them?

**Answer:**

---

### Q12 · Are the compliance scripts server-served or a frontend constant?

*Why:* `src/letan/system.ts` holds the AI-disclosure and recording-consent block, the
medical-advice refusal script, the red-flag pack and the PDPL data-minimisation rule. They
render read-only. **If any of it is legally required disclosure, a legal change must not
require a frontend deploy** — Law 134/2025 and Law 91/2025 are both young and both moving.

**Recommendation:** server-served, in the config response.

**Answer:**

---

### Q13 · Will `GET /tenant/config` return a `catalogue_version` string?

*Why:* The catalogue lives in the backend repo and will change without this one noticing. The
failure mode is silent — a renamed field simply stops being saved, and nothing errors. A
version string compared against a constant in `model.ts` turns silent drift into a loud
development warning.

**Recommendation:** yes. It costs one string.

**Answer:**

---

### Q14 · Does the tenant record store split fields as one merged array or two columns?

*Why:* The catalogue defines `escalation_triggers` and `emergency_red_flags` as *"SW, tenant
may add, never remove"*. The frontend keeps the system rows in `system.ts` and the tenant's in
`escalation_triggers_custom` / `emergency_red_flags_custom`.

**Recommendation:** two columns. It makes "the tenant cannot remove a system row" a schema
property rather than something every writer has to remember, and it lets Fonnus update the
pack without touching tenant data.

**Answer:**

---

## Auth

### Q15 · Cookie name, attributes, lifetime — and which domain the API is deployed on

*Why:* The frontend sends `credentials: 'include'` and stores no token. Everything then
depends on cookie attributes, and `Access-Control-Allow-Origin: *` is **illegal** with
credentials.

**Recommendation:** deploy the API on a subdomain of the same registrable domain as the app
(`app.fonnus.vn` ↔ `api.fonnus.vn`). Same-site despite different origins, so the cookie stays
`SameSite=Lax` and no CSRF-token machinery is needed. An unrelated domain forces
`SameSite=None; Secure` and reopens CSRF.

Also: does `POST /auth/otp/verify` set the cookie directly, or return a one-time token to
exchange?

**Answer:**

---

### Q16 · Should `POST /auth/otp` keep disclosing whether the number already has an account?

*Why:* It returns `{ existing_account }` today and the sign-up flow branches on it — a
registered number silently becomes a sign-in instead of an error, which is the single biggest
drop-off fix in phone-first flows. **It is also a phone-number enumeration oracle.** Flagging
it as a deliberate trade-off rather than an accident, because removing it changes a UI flow.

**Answer:**

---

### Q17 · OTP policy: expiry, resend interval, attempt limit, lockout — and the error code for each

*Why:* The UI currently hardcodes 6 digits and a 42-second resend cooldown, and it has **no
lockout state at all**. If there is a lockout, it needs a screen, and each failure mode needs
its own Vietnamese sentence.

**Answer:**

---

### Q18 · Google OAuth: what redirect URI, given hash routing? — ~~closed~~

*Closed by the port to Next.js.* The question existed because the Vite prototype routed on
fragments (`#/app/le-tan/...`) and a fragment survives an OAuth redirect only if the backend
writes it into the redirect URI. Fonnus-FE routes on real paths (ADR 0003), so the redirect URI
is an ordinary `https://app.fonnus.vn/app` and there is nothing left to get wrong.

---

## Files, TTS, voice

### Q19 · Knowledge files: multipart or presigned PUT, and how does `status` reach `indexed`?

*Why:* The UI enforces 20 MB and a fixed extension list, and models `status` as
`queued → indexed` with no mechanism behind it. Poll or push? What does an extraction result
look like — and note the UI promises the owner **in writing** that they review every
suggestion before the agent uses it, so results must be proposed, never auto-applied. Virus
scanning?

**Answer:**

---

### Q20 · TTS preview: audio format, URL lifetime, caching, rate limit

*Why:* There is a play button on nearly every configuration section. A naive implementation
bills ElevenLabs for the same greeting a hundred times in one setup session.

**Recommendation:** cache on a hash of `(text, voice, speed)`.

**Answer:**

---

### Q21 · Is the landing-page voice demo unauthenticated — and what stops it costing real money?

*Why:* Every click on the orb costs Deepgram + Qwen + ElevenLabs, from a public marketing
page, with no sign-in. This is a cost and abuse question, not a technical one, and it should
be answered **before** the endpoint exists rather than after the first bill.

**Recommendation:** per-IP budget, hard max call duration, and a kill switch that degrades to
today's scripted demo.

**Answer:**

---

## Smaller confirmations

### Q22 · Is `email_rules` a real product feature?

*Why:* The whole Kỹ năng → "Gửi email" skill writes it, and it is **not in catalogue v1 at
all**. It implies an outbound email service, per-intent triggers and template rendering — a
feature, not a field. Confirm it is in scope, or the UI should be marked "coming later" rather
than looking finished.

**Answer:**

---

### Q23 · Formats: confirm times, dates and money

*Why:* Cheap to confirm, annoying to discover.

- Times of day as `"08:00"` strings, not timestamps
- Dates as ISO `"2027-02-14"`
- All wall-clock times Asia/Ho_Chi_Minh
- Money as **integer VND**, no decimals — `1500000`
- `null` means "not answered", distinct from `0` and `""`

**Answer:**
