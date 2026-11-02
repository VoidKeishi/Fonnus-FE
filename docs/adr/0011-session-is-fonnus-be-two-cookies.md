# ADR 0011: The session is Fonnus-BE's two cookies, refreshed once on a 401

**Status:** accepted · **Date:** 2026-11-02

Amends ADR 0003 points 3 and 9 (the `auth` group and the session probe) and replaces §2 of
`docs/api-contract.md` as this repo wrote it before Fonnus-BE existed.

## Context

Fonnus-BE now exists and has designed its own auth (`../Fonnus-BE/docs/api.md` §Auth,
`docs/features/phone-login.md`). It differs from the contract this repo proposed in
2026-09 on four points that reach into code here:

1. Sign-in is by mobile number only: `POST /auth/login { mobile_number }` sends the code,
   `POST /auth/login/verify-otp { mobile_number, code }` opens a session. There is no
   email code, no Google, and no `existing_account` flag: a number with no account is
   refused with `404 mobile_number_not_found`.
2. The session is **two** httpOnly cookies, not one: `fonnus_access` (a 15-minute JWT,
   `Path=/api/v1`) and `fonnus_refresh` (30 days, sliding, `Path=/api/v1/auth`).
   `POST /auth/refresh` mints a new access token and resets the 30 days; it answers
   `{ user_id }`. A business endpoint answers `401 unauthorized` when the access token has
   expired, and the backend expects the frontend to refresh once and retry.
3. There is no `GET /me`. The signed-in user is `GET /users/:userId`, which needs the id.
4. The user record is `{ id, mobile_number, full_name | null }`. No display name, no clinic
   name, no plan.

The product owner has also asked for a sign-in entry on the marketing header again
("Danh sách chờ" primary, "Đăng nhập" secondary), which makes the sign-in door a real
path into the app rather than a URL only the team knows.

## Decision

1. **`src/api/contracts.ts` `auth` group takes Fonnus-BE's shape, verbatim.**
   `Me` is `{ id, mobile_number, full_name: string | null }`. The group is four methods:
   `me()`, `requestLoginOtp(mobile_number)`, `verifyLoginOtp({ mobile_number, code })`,
   `logout()`. The email, Google and profile methods are removed: nothing calls them, and
   F1b re-adds what it needs when its screen lands (ADR 0011 of `../Fonnus`, applied here
   as "nothing ships ahead of its first consumer").
2. **The session probe is `POST /auth/refresh` then `GET /users/:user_id`.** `me()` in the
   live implementation makes those two calls and resolves `null` when refresh answers
   `401 unauthorized` or `401 session_expired`. Nothing about the user is kept in the
   browser between visits: the refresh cookie is the only memory, and it is the backend's.
   Every probe extends the 30-day session, which is the sliding window Fonnus-BE designed.
3. **A 401 on a business endpoint is refreshed once, then retried once.** In `http.ts`:
   a response of 401 on a request not marked `expect401` calls `POST /auth/refresh`; if it
   answers 2xx the original request is sent again, once; if the retry is 401 too, or the
   refresh itself fails with 401, the existing unauthorized handler fires (sign out,
   redirect to `/dang-nhap`). Several requests failing at once share **one** refresh in
   flight. A write is retried after a refresh as well: an access token that has expired is
   refused before the handler runs, so the write never happened.
   The routes marked `expect401` — the login pair, refresh itself, the probe's own
   `GET /users/:id` — never trigger a refresh.
4. **The probe runs only where a session matters:** under `/app`, on `/dang-nhap` and on
   `/dang-ky`. The marketing pages make no request to Fonnus-BE on load (as
   `docs/architecture.md` §2.4 already intended; it was deferred while the backend was
   empty). With a real backend, every probe is a database write, and the landing page has
   no reason to cause one.
5. **The client never reads a cookie.** `credentials: 'include'` on every request, as
   before. The dev rewrite in `next.config.ts` keeps the `/api/v1` path, so both cookie
   paths match on `localhost:3000`; in production the posture of ADR 0003 point 6 stands.
6. **`docs/api-contract.md` §2 is rewritten to this shape** and says that
   `../Fonnus-BE/docs/api.md` is the authority for `auth` from now on — the first group to
   cross the line ADR 0003 §Revisit drew. The repo rule stands: `contracts.ts` and
   `api-contract.md` change together.
7. **The mock keeps the demo login** (`0914378064` / `111002`) and answers the same shapes
   from `localStorage`; it has no cookies and no refresh.

## Rejected

- **Keeping `user_id` in `localStorage` so the probe can be `GET /users/:id` alone.** One
  request instead of two while the access token is still valid (15 minutes), but three on
  the common case — an owner coming back the next day — and one more piece of browser state
  that outlives the session. The refresh-first probe is the same cost on the common case
  and keeps nothing.
- **Asking Fonnus-BE for `GET /me` before building.** It blocks this task on the other
  repo for one request saved per boot. Recorded as a non-blocking suggestion in
  `docs/open-questions.md` instead.
- **A backend-for-frontend holding the refresh logic.** Already rejected in ADR 0003; two
  cookies change nothing about why.
- **Keeping the email door on the screen until Fonnus-BE serves it.** A control that
  does nothing is worse than none (the reasoning this repo already applied to Google in
  F1); the prototype's three doors return one by one as the backend serves them.

## Consequences

- `Me` loses `display_name`, `clinic_name` and `plan`. The sidebar shows `full_name`, or the
  formatted mobile number when it is null; the clinic line stays empty until the `tenant`
  group (F3) provides a name. `plan` returns with F6.
- "Lần trước" and `last-method.ts` go with the email door: with one way in there is nothing
  to remember. The hydration-mismatch backlog row about it dissolves.
- The resend countdown reads `resend_after_seconds` from the response instead of a constant.
- New Vietnamese sentences in `src/api/errors.ts` for `mobile_number_not_found`,
  `otp_delivery_failed` and the `invalid_mobile_number` field code.

## Revisit when

- Fonnus-BE adds `GET /me` — point 2 becomes one request, nothing else changes.
- Fonnus-BE serves email or Google sign-in — F1b, which reopens the doors on the screen.
- The API is deployed on a domain that is not same-site with the app — `SameSite=None`
  and a CSRF token, the case ADR 0003 point 6 and `api-contract.md` §1 warn about.
- Fonnus-BE wants to own the whole contract — move `docs/api-contract.md` there, as
  ADR 0003 §Revisit says.
