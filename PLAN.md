# Fonnus-FE — Plan

The single live tracker for this repo. Updated in the finishing commit of every task.
Status: ⬜ not started · 🔨 in progress · ✅ done, with the date.

## Roadmap

| Step | Status | Notes |
|---|---|---|
| **F0 · Scaffold** — Next.js 16 App Router, pnpm, strict TypeScript, ESLint, Tailwind v4 over the copied tokens, the three fonts through `next/font`, assets moved, docs written, `src/api/` seam with the `auth` group | ✅ 2026-09-15 | Every route in the design exists; the ones that are not built say so through `src/ui/placeholder.tsx` |
| **F1 · Sign-in** — `/dang-nhap` with the phone and email code flows, `SessionProvider`, the demo login as the acceptance test | ✅ 2026-09-15 | Two of the three doors. Google sign-in and the whole of `/dang-ky` are F1b below |
| **F1b · Sign-up and Google** — `/dang-ky` (clinic name, the Terms line, an existing number turning a sign-up into a sign-in) and Google on both doors: the in-page chooser for mock mode, the OAuth redirect for live | ⬜ | `/dang-ky` is a placeholder today. Google needs `googleAuthUrl()` pointed at a real endpoint, so it waits on `../Fonnus-BE` |
| **F2 · The app shell** — `/app` layout: 216px sidebar, icon rail at ≤900px, bottom tab bar on phones; the session and toast providers | 🔨 | The frame, the nav and the session gate are in place (`src/shell/`, `src/session/`); the toast provider and the readiness dot on Lễ tân are not. Everything under `/app` is client-rendered by design (CLAUDE.md) |
| **F3 · Lễ tân** — the hub and the three tabs (Hồ sơ, Kiến thức, Kỹ năng), the shared section frame, the save stack, the try-out panel. Brings `src/features/receptionist/model.ts` and `docs/field-catalogue-mapping.md` into force | ⬜ | The largest single step: ~60 fields across 13 forms |
| **F4 · Landing page** — the landing page at `/` and the "Chấm điểm hotline" page at `/cham-diem-hotline`, ported from `../Fonnus-Web-UI` in nine stacked pull requests: the marketing frame, the hero, the voice orb and its call demo, pricing, how it works, capabilities, FAQ with security and testimonials, the contact form against `POST /leads`, and the hotline page against `POST /leads/hotline-report` | 🔨 | Server-rendered; this is the acquisition surface. The header always shows "Đăng nhập" and "Dùng thử miễn phí", as the prototype does, and reads no session. The call demo runs in the browser with no `voice` group until Q21 is answered. A nav or footer link appears only in the pull request that lands its section |
| **F5 · Cuộc gọi** — the clinic's own call history | ⬜ | Blocked: `GET /calls` is "specified later" in `docs/api-contract.md` §7 and has no agreed shape |
| **F6 · Lịch hẹn, Số điện thoại, Cài đặt** | ⬜ | |
| **F7 · Deployment** — an ADR on where this runs, then the container, the proxy and CI | ⬜ | Deliberately undecided: this is a public site and Fonnus-Admin's posture (same VPS as the pipeline, behind basic auth) does not transfer. `output: 'standalone'` in `next.config.ts` (as Fonnus-Admin) and the build SHA on `/api/healthz` wait here: both are deployment posture, not layout |

## Waiting on ../Fonnus-BE

Fonnus-BE is an empty directory today. Every group below is faked in the browser until it is
not; `NEXT_PUBLIC_API_LIVE_GROUPS` switches them on one at a time. The questions behind each
row are in `docs/open-questions.md`; the shapes are in `docs/api-contract.md`.

| Group | Endpoints | Unlocks | Status |
|---|---|---|---|
| `auth` | `POST /auth/otp`, `/auth/otp/email`, `/auth/otp/verify`, `GET /me`, `PATCH /me`, `POST /auth/signout` | A real sign-in instead of the demo account | ⬜ Declared in `src/api/contracts.ts`, mocked |
| `tenant` | `GET`/`PATCH /tenant/config`, `POST /tenant/config/reset` | F3 against real data | ⬜ Not declared yet |
| `knowledge` | `POST`/`DELETE /tenant/knowledge-files` | Knowledge file upload in F3 | ⬜ Not declared yet |
| `voice` | `POST /tts/preview` | Hearing the receptionist speak | ⬜ Not declared yet |
| `receptionist` | `POST /receptionist/preview` | The try-out panel in F3 | ⬜ Not declared yet |
| `leads` | `POST /leads` | The landing page contact form in F4 | ⬜ Not declared yet |
| `calls` | `GET /calls` | F5 | ⬜ Shape not specified — `api-contract.md` §7 |

A group is declared in `src/api/contracts.ts` when the screen that calls it is built, not
before (ADR 0003).

## Decisions the user still owes

Each blocks nothing today and has a default that applies if nothing is said.

1. **The domain and cookie posture between Fonnus-FE and Fonnus-BE.** `api-contract.md` §1
   warns this is worth settling before the first integration day rather than discovering on
   it. Two subdomains of one registrable domain (`app.fonnus.vn` and `api.fonnus.vn`) keeps
   the cookie `SameSite=Lax` with no CSRF token machinery, at the cost of a CORS
   configuration that echoes the exact origin. Proxying through Next.js in production makes
   the cookie fully first-party and removes CORS, at the cost of a hop and a divergence from
   the written contract. **Recommendation: two subdomains**, which is what the contract
   already says; development uses the rewrite either way. **Default if undecided:** the
   subdomain posture stands as written in ADR 0003.
2. **Where Fonnus-FE is deployed** — see roadmap row F7. **Default if undecided:** nothing
   is decided and `CONTEXT.md` §Deployment keeps saying so.
3. **Whether Cài đặt is a sidebar destination.** The prototype keeps it out of the nav list:
   on a wide screen it sits under the user block at the bottom of the sidebar, beside sign
   out, and on a phone it is reached through "Thêm". This repo's `src/shell/nav.ts` lists it
   as the sixth destination, so it shows as a regular tab beside Số điện thoại. Keeping it
   in the nav makes settings one tap from anywhere, at the cost of a sixth tab competing
   with the five the owner opens daily; following the prototype keeps the nav to the
   screens that change day to day and puts settings with the account, where the owner
   looks for their plan and sign-out. **Recommendation: follow the prototype**, decided
   when F6 builds Cài đặt, so the placement and the screen land together. **Default if
   undecided:** the prototype's placement, since it is the design authority.

## Backlog

Layout items are the gap between today's tree and `docs/architecture.md` (ADR 0004); the
ones sized S landed with the ADR on 2026-09-17.

- **Error boundaries** (M): `error.tsx` in `(auth)/` and `app/`, later `(marketing)/`, plus
  `global-error.tsx` at the root in plain HTML. The prototype never drew a render-failure
  screen, so today it is Next.js's white English page; the copy is new and follows
  `docs/ui-ux-principles.md` §9, with a retry button. One approval on the copy, then a
  build.
- **The session probe only where a session matters** (M): `SessionProvider` probes `GET /me`
  on every route, the landing page included. `docs/architecture.md` §2.4 wants it limited to
  `/app`, `/dang-nhap` and `/dang-ky`. Deferred out of F4 by the owner's call: the deeper
  sign-in flows wait until Fonnus-BE exists. It touches the session gate, so the demo login
  is re-checked in the same change.
- **A signed-in owner on `/dang-nhap` goes straight to `/app`** (S): today they see the phone
  form as if new. With this, the landing page's "Đăng nhập" is the way back into the app and
  no "Vào ứng dụng" button is needed. Same deferral as above.
- **A link styled as a button** (M): `<Link><Button>` puts a `<button>` inside an `<a>`, which
  is invalid HTML and gives a screen reader two controls for one. It is how the auth pages
  and the marketing header open `/dang-ky` and `/dang-nhap`. `Button` needs a link form, or
  a class a `Link` can wear.
- **Base-palette names in components** (M): about twelve uses of `--milk`, `--blush`,
  `--terracotta`, `--night` in `src/features/auth/sign-in-panel.tsx`, `field.tsx`,
  `otp-field.tsx` and `src/design-system/button.tsx` (its `inverse` variant reads `--night` and `--cream-night`); `src/design-system/icon.tsx` falls back to `var(--terracotta)`. Each needs an alias line in
  `globals.css` `@theme` and then the class; ADR 0002 point 2 forbids the base names.
- **`api/auth.mock.ts` imports `features/auth/phone.ts`** (S): the mock normalises the
  typed phone number to match the demo account, and reaches into a feature to do it —
  the one import today that breaks `docs/architecture.md` §2.1 (`api/` imports nothing
  outside itself). Move `normalizePhone` and `isValidEmail` next to the mock, or into
  `mock-support.ts`, with the feature importing from there; decide with the lint gate
  below, which would flag it.
- **The import-direction lint gate** (S): one `no-restricted-imports` glob in
  `eslint.config.mjs` — `features/X` never imports `@/features/Y`; `ui/`, `design-system/`
  and `api/` never import `@/features`, `@/session`, `@/shell`. Added with the first task
  that gives `features/` its second directory (F3 or F4), because before that the rule has
  nothing to catch.
- A token-copy test, in the shape of `../Fonnus-Admin/src/styles/tokens.test.ts`, asserting
  the six token files are byte-identical to their source in `../Fonnus-Web-UI`.
- An SSR regression test: import `src/api/index.ts` in a Node environment with no `window`
  and assert it does not throw.
- Every use of `src/ui/placeholder.tsx` is a screen that does not exist yet. Deleting the
  last one closes this roadmap; `grep -rl Placeholder src/app` lists them.
- `../Fonnus-Admin` pins its token copies against `../Fonnus-Web-UI`. When that prototype is
  fully retired, both repos need to agree on a new source.
