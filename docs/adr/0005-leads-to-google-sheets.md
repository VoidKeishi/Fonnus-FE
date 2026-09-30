# ADR 0005: The two marketing forms write to a Google Sheet through a route handler in this app

**Status:** accepted · **Date:** 2026-09-30

## Decision

The `leads` group — the landing page's contact form and the "Chấm điểm hotline" request — is
no longer implemented by `../Fonnus-BE`. This app receives both forms itself and appends them
to a Google Sheet. Every other group still goes to Fonnus-BE exactly as ADR 0003 says.

This rests on one premise the owner has stated: the site is deployed on Vercel, so a route
handler runs as a Node.js function and the project can hold a secret.

1. **Two route handlers in this app receive the forms**: `POST /api/leads` and
   `POST /api/leads/hotline-report`, on this app's own origin. They sit outside `/api/v1`,
   which stays Fonnus-BE's path and is rewritten to it in development.
2. **The wire contract does not change.** Request bodies, `202`, the `422` field list, `429`
   and `5xx` stay as `docs/api-contract.md` §6 describes them; only the implementer and the
   path change. The forms, their copy and `leads.mock.ts` are untouched, and handing the
   group to Fonnus-BE later is a change of base URL.
3. **`leads.live.ts` calls this origin, not `API_BASE_URL`.** `http.ts` gains one option to
   address this app's own origin; in production `API_BASE_URL` is Fonnus-BE's origin and the
   forms must not go there.
4. **Server-only code lives in a new shared directory, `src/server/`**, the sixth beside the
   five in ADR 0004 point 3. The `route.ts` files stay thin and import one function each, as
   a `page.tsx` does. The gate is a lint rule: nothing outside `src/app/` imports
   `src/server/`. The modules that read a secret or open a connection also start with
   `import 'server-only'`, so a client component importing one fails the build; the pure
   modules (checking the input, shaping the rows, signing the token) do not, because the
   test runner cannot resolve that import and they are the ones under test. `src/server/`
   may import the pure rules in `src/api/phone.ts` and the types in `src/api/contracts.ts`.
5. **The handler checks everything again**, with the same rules the forms use
   (`isValidCallbackNumber`, `isValidEmail`, non-empty trimmed text, 1–20 locations), plus a
   length cap per field and a cap on the body size. A body whose `Content-Type` is not
   `application/json` is refused with `415`: a `text/plain` POST needs no CORS preflight, so
   without this any other site could make a visitor's browser append a row from that
   visitor's own IP, which a per-IP rate limit cannot count. A refusal is a `422` in the shape §6
   already specifies, with one new code, `too_long`. The inputs carry a matching
   `maxLength`, so a visitor typing in the form never meets it.
6. **Google access is a service account and the Sheets API, with no new dependency.** The
   handler signs an RS256 JWT with `node:crypto`, exchanges it at
   `https://oauth2.googleapis.com/token` for an access token (scope
   `https://www.googleapis.com/auth/spreadsheets`), and calls `spreadsheets.values.append`.
   The token is reused inside one warm function instance until shortly before it expires;
   nothing depends on that reuse, because a function instance cannot be relied on to keep
   state between requests.
7. **One spreadsheet, two tabs.** `leads`: one row per contact request — received time,
   clinic name, contact name, phone, source. `hotline_report`: one row per location —
   received time, a request id shared by the rows of one submission, contact name, email,
   clinic name, the location's ordinal, address, phone. Rows are appended with
   `valueInputOption=RAW` and `insertDataOption=INSERT_ROWS`: `RAW` keeps a leading `0` on a
   phone number and stops typed text being evaluated as a formula. A submission of 20
   locations is one append request.
8. **Three server-side variables, read only in `src/server/env.ts`**: the service account's
   email, its private key, and the spreadsheet id. None is prefixed `NEXT_PUBLIC_`. The lint
   rule that allows `process.env` only in `src/api/env.ts` gains this one second file. In
   Vercel the key is a Sensitive variable. A missing variable makes the handler answer `503`;
   the form then shows its ordinary server-failure line.
9. **Rate limiting is a Vercel Firewall rule, not code**: one fixed-window rule keyed on IP
   over `/api/leads*`, answering `429`. `http.ts` already maps a `429` with any body to the
   "Bạn thao tác hơi nhanh…" line. The rule lives in the Vercel project, so `README.md`
   records it. No CAPTCHA, as §6 already requires.
10. **A Google failure is a `503` and is never retried by the handler.** The visitor keeps
    what they typed and can send again, which is the behaviour §6 already promises.
11. **For now the spreadsheet and the Google Cloud project belong to a personal Gmail
    account.** That is the owner's call and it is temporary; see "Revisit when".

## Why

- Fonnus-BE is an empty directory and both forms currently send to nothing. A request for a
  hotline report is followed by people ringing the clinic by hand, so a sheet is not only
  storage: it is the working list the team would otherwise need a screen for.
- ADR 0003 point 5 rejected a backend-for-frontend for two reasons: it would have to forward
  the session cookie, and there was "no server-side secret here to justify the hop". Neither
  holds for `leads`: the forms are unauthenticated and the Google credential is a secret.
  The rejection stands for every authenticated group.
- A route handler returns real status codes, sees the client's IP behind Vercel, and needs no
  CORS, so the contract survives unchanged. That is what makes the choice reversible.
- Google's own documentation describes the token exchange without a client library, and
  RS256 is the only algorithm it accepts, so hand-signing is about fifty lines against a
  dependency list of three (ADR 0001).

## Rejected

- **A Google Apps Script web app called from the browser.** No infrastructure and no secret,
  but the request event carries neither IP nor headers (Google has declined to add them), so
  there is no rate limit; Google's documentation is silent on status codes and CORS, and the
  community reports a fixed `200` and no preflight support; and the script's source would
  live outside this repo.
- **Posting to a Google Form.** The Forms API has no method to submit a response
  (`forms.responses` is `get` and `list` only), so this is an unsupported use, the browser
  cannot read the result, and 20 locations do not fit a form's fixed fields.
- **The Sheets API straight from the browser.** `spreadsheets.values.append` requires an
  OAuth scope; an API key cannot write, and a browser cannot hold the credential.
- **The `googleapis` or `google-auth-library` package.** A fourth runtime dependency for one
  signed token and one POST.
- **Rate limiting in the handler's memory.** Function instances do not share state, so the
  count would reset per instance.
- **Waiting for Fonnus-BE.** The contract is ready, and the forms stay dead until a server
  exists.

## Assumed, to confirm during the build

- Sharing the spreadsheet with the service account's email as an editor is what lets it
  append. Settled by the first live append.
- A Google Cloud project under a personal Gmail account is not subject to the organization
  policy that disables service account key creation (enforced by default for organizations
  created on or after 2024-05-03). Settled by creating the key.
- A private key pasted into a Vercel variable may arrive with literal `\n` instead of line
  breaks; `src/server/env.ts` accepts both. Settled by the first deployed request.

## Revisit when

- The sheet moves to a company Google account. If that account's organization forbids
  service account keys, the credential becomes Workload Identity Federation through Vercel's
  OIDC token, and point 6 is rewritten.
- Someone with legal standing answers whether keeping a contact's name and email in Google
  counts as a cross-border transfer of personal data under PDPL (Law 91/2025/QH15) and
  Decree 356/2025/ND-CP. Until then this is an open question in `PLAN.md`.
- Spam reaches the sheet despite the Firewall rule. The next step is a hidden honeypot field
  on both forms, which changes the wire contract.
- Fonnus-BE ships `POST /leads`. `leads.live.ts` goes back to `API_BASE_URL`, the route
  handlers and `src/server/` are deleted, and the sheet is imported.
- Submissions approach 60 a minute, the Sheets API's per-user write quota, which one service
  account shares.
- A second thing in this app needs a server-side secret. `src/server/` then needs rules of
  its own in `docs/architecture.md` rather than one paragraph.
