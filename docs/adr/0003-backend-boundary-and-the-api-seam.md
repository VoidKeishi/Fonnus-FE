# ADR 0003: Fonnus-FE is a pure HTTP client of Fonnus-BE, behind a mock/live seam

**Status:** accepted · **Date:** 2026-09-15

## Decision

This repo reads no database and talks to exactly one server: `../Fonnus-BE`, over HTTP, in
the browser. It has no `pg`, no `DATABASE_URL`, no SQL, and no server-side data fetching.

1. **The boundary.** The call pipeline `../Fonnus` deliberately serves no product API — its
   whole HTTP surface is `/healthz` and `/metrics`, bound to loopback — and its ADR 0013
   forbids another repo writing to pipeline-owned tables. Everything this frontend needs,
   Fonnus-BE serves. The wire format is `docs/api-contract.md`, which lives here because
   this repo wrote it and consumes it, and which Fonnus-BE implements.
2. **One interface, two implementations, per group.** `src/api/contracts.ts` is types only.
   Each group of endpoints has a `*.mock.ts` faking it in the browser and a `*.live.ts`
   making real requests, both typed against the same interface, so `pnpm typecheck` is what
   fails the moment a live implementation drifts from the mock it replaces. That is the
   entire drift mechanism and there is no second one. `src/api/index.ts` is the only file
   that chooses between them.
3. **Live is switched on per group**, through `NEXT_PUBLIC_API_LIVE_GROUPS=auth`, not
   globally. Fonnus-BE will ship endpoints over weeks; with only a global switch the first
   real endpoint could not be exercised until every other one existed. `auth` is the only
   group declared today — a group is added when the screen that calls it is built, not
   before.
4. **Mock mode is the committed default**, and it is not a convenience: it is what lets the
   whole product be demonstrated to a customer with no backend running, which is the stated
   purpose of this repo's first milestone. `NEXT_PUBLIC_MOCK_FAILURE_RATE=1` is likewise the
   only way to reach the loading, error and retry states before a server exists.
5. **The browser calls the API; Next.js does not fetch on its behalf.** No route handlers
   proxying the API, no `fetch` in a server component, no backend-for-frontend. The session
   is an httpOnly cookie the *browser* holds, and the mock implementations are
   localStorage-backed and cannot run on a server at all — a server-fetch design forks the
   two modes at exactly the layer that must not fork. There is no server-side secret here to
   justify the hop.
6. **The transport is same-origin `/api/v1` in development**, forwarded by a rewrite in
   `next.config.ts` to `API_PROXY_TARGET`, which is read there and never reaches the bundle.
   That removes CORS from development entirely. In production `NEXT_PUBLIC_API_BASE_URL` is
   set to Fonnus-BE's own origin and the posture of `api-contract.md` §1 applies: two
   subdomains of one registrable domain, `SameSite=Lax`, an exact origin echo with
   `Access-Control-Allow-Credentials: true`. `Access-Control-Allow-Origin: *` is illegal
   with credentials.
7. **The frontend owns every Vietnamese sentence the user reads.** Fonnus-BE returns
   RFC 9457 `application/problem+json` with a machine-readable `code`; `src/api/errors.ts`
   maps codes to copy. No server prose is ever rendered.
8. **Catalogue field names are used verbatim, in `snake_case`.** There is no camelCase
   mapping layer between the wire and the model, ever — a rename is how a 60-field
   configuration silently loses a field.
9. **No `middleware.ts` gating `/app` in this milestone.** A cookie-reading middleware
   cannot work in mock mode, where the session lives in localStorage and no cookie exists.
   Gating stays in `SessionProvider`, which probes `GET /me` at boot and redirects.
10. **Only `src/api/env.ts` reads `process.env`**, enforced by a lint rule. Next.js replaces
    only a *literal* `process.env.NEXT_PUBLIC_X` at build time, so a value read through a
    computed key or a destructured object is `undefined` in the browser and defined on the
    server. Every variable name is therefore written out in full, once, in that file.

## Why

- The pipeline cannot be the API and must not be written to directly; that is settled in
  `../Fonnus/docs/adr/0013-repo-boundaries.md` and is why Fonnus-BE exists at all.
- The seam was the prototype's best idea and it survives the rewrite unchanged, because it
  is what keeps a demonstrable product alive while the backend is still empty. Nothing else
  in this repo would let the whole product be shown to a customer today.
- Per-group switching is the difference between integrating incrementally and integrating in
  one terrifying step on the day everything is supposedly ready.

## Rejected

- **A backend-for-frontend inside Next.js.** It would have to intercept `Set-Cookie` on the
  verify call and re-emit it on its own origin, forward `x-request-id`, and it breaks the
  mock mode outright. Real code and a real failure mode in exchange for hiding a secret this
  repo does not have.
- **React Server Components fetching the signed-in screens.** Same cookie-forwarding
  problem, and it gains nothing: `/app` is a logged-in, optimistically-edited application
  with nothing for a crawler to read.
- **A global mock/live switch.** Simpler by one concept, and it makes the first delivered
  endpoint untestable.
- **A camelCase model with a mapping layer at the edge.** Idiomatic JavaScript, and the
  wrong trade against a catalogue of ~60 fields whose names are the contract.

## Revisit when

- The voice session lands. It is a WebSocket, and the Next.js rewrite proxy does not perform
  an upgrade — that group must dial Fonnus-BE's origin directly, which is the second reason
  the absolute-base-URL mode exists.
- `NEXT_PUBLIC_API_MODE=live` becomes the deployed default — a middleware then buys a
  flash-free redirect and point 9 is worth reopening.
- Fonnus-BE exists and wants to own the contract it serves — move `docs/api-contract.md`
  there and leave a pointer here.
