# Fonnus-FE — Plan

The single live tracker for this repo. Updated in the finishing commit of every task.
Status: ⬜ not started · 🔨 in progress · ✅ done, with the date.

## Roadmap

| Step | Status | Notes |
|---|---|---|
| **F0 · Scaffold** — Next.js 16 App Router, pnpm, strict TypeScript, ESLint, Tailwind v4 over the copied tokens, the three fonts through `next/font`, assets moved, docs written, `src/api/` seam with the `auth` group | ✅ 2026-09-15 | Every route in the design exists; the ones that are not built say so through `src/ui/placeholder.tsx` |
| **F1 · Sign-in** — `/dang-nhap` with the phone and email code flows, `SessionProvider`, the demo login as the acceptance test | ✅ 2026-09-15 | Two of the three doors. Google sign-in and the whole of `/dang-ky` are F1b below |
| **F1b · Sign-up and Google** — `/dang-ky` (clinic name, the Terms line, an existing number turning a sign-up into a sign-in) and Google on both doors: the in-page chooser for mock mode, the OAuth redirect for live | ⬜ | `/dang-ky` is a placeholder today. Google needs `googleAuthUrl()` pointed at a real endpoint, so it waits on `../Fonnus-BE` |
| **F2 · The app shell** — `/app` layout: 216px sidebar, icon rail at ≤900px, bottom tab bar on phones; the session and toast providers | 🔨 | The frame, the nav and the session gate are in place; the toast provider and the readiness dot on Lễ tân are not. Everything under `/app` is client-rendered by design (CLAUDE.md) |
| **F3 · Lễ tân** — the hub and the three tabs (Hồ sơ, Kiến thức, Kỹ năng), the shared section frame, the save stack, the try-out panel. Brings `src/letan/model.ts` and `docs/field-catalogue-mapping.md` into force | ⬜ | The largest single step: ~60 fields across 13 forms |
| **F4 · Landing page** — header, hero with the voice orb, the section stack, pricing, footer, the contact form against `POST /leads` | ⬜ | Server-rendered; this is the acquisition surface |
| **F5 · Cuộc gọi** — the clinic's own call history | ⬜ | Blocked: `GET /calls` is "specified later" in `docs/api-contract.md` §7 and has no agreed shape |
| **F6 · Lịch hẹn, Số điện thoại, Cài đặt** | ⬜ | |
| **F7 · Deployment** — an ADR on where this runs, then the container, the proxy and CI | ⬜ | Deliberately undecided: this is a public site and Fonnus-Admin's posture (same VPS as the pipeline, behind basic auth) does not transfer |

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

## Backlog

- A token-copy test, in the shape of `../Fonnus-Admin/src/styles/tokens.test.ts`, asserting
  the six token files are byte-identical to their source in `../Fonnus-Web-UI`.
- An SSR regression test: import `src/api/index.ts` in a Node environment with no `window`
  and assert it does not throw.
- Every use of `src/ui/placeholder.tsx` is a screen that does not exist yet. Deleting the
  last one closes this roadmap; `grep -rl Placeholder src/app` lists them.
- `../Fonnus-Admin` pins its token copies against `../Fonnus-Web-UI`. When that prototype is
  fully retired, both repos need to agree on a new source.
