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
| **F4 · Landing page** — the landing page at `/` and the "Chấm điểm hotline" page at `/cham-diem-hotline`, ported from `../Fonnus-Web-UI` in nine stacked pull requests: the marketing frame, the hero, the voice orb and its call demo, pricing, how it works, capabilities, FAQ with security and testimonials, the contact form against `POST /leads`, and the hotline page against `POST /leads/hotline-report` | ✅ | Server-rendered; this is the acquisition surface. The header always shows "Đăng nhập" and "Dùng thử miễn phí", as the prototype does, and reads no session. The call demo runs in the browser with no `voice` group until Q21 is answered. A nav or footer link appears only in the pull request that lands its section |
| **F4b · Leads to a Google Sheet** — the contact form and the "Chấm điểm hotline" request stop waiting on `../Fonnus-BE`: this app receives them in two route handlers and appends them to a Google Sheet (ADR 0005). Four stacked pull requests: the decision, `POST /api/leads`, `POST /api/leads/hotline-report`, then both forms switched to them | ✅ 2026-09-30 | Built and gated by typecheck, lint, test and build only: no request has reached a real sheet yet. `NEXT_PUBLIC_API_LIVE_GROUPS=leads` turns both forms live at once. What remains is the owner's setup and the first live append; see Backlog |
| **F5 · Cuộc gọi** — the clinic's own call history | ⬜ | Blocked: `GET /calls` is "specified later" in `docs/api-contract.md` §7 and has no agreed shape |
| **F6 · Lịch hẹn, Số điện thoại, Cài đặt** | ⬜ | |
| **F7 · Deployment** — an ADR on how this runs on Vercel: the domain, the environments, CI, and the cookie posture towards Fonnus-BE | ⬜ | The host is Vercel (the owner's choice, and the premise of ADR 0005); everything else is undecided. The build SHA on `/api/healthz` waits here |

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
| `calls` | `GET /calls` | F5 | ⬜ Shape not specified — `api-contract.md` §7 |

A group is declared in `src/api/contracts.ts` when the screen that calls it is built, not
before (ADR 0003). The `leads` group is not in this table: this app implements it itself
(ADR 0005).

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
2. **How Fonnus-FE runs on Vercel** — the host is chosen; the domain, the environments and
   CI are not. See roadmap row F7. **Default if undecided:** `CONTEXT.md` §Deployment keeps
   saying what is open.
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

4. **Whether a contact's name, phone and email may sit in Google Sheets.** The two marketing
   forms store them there (ADR 0005). If that counts as a cross-border transfer of personal
   data under PDPL (Law 91/2025/QH15) and Decree 356/2025/ND-CP, it may need a filing or a
   line of consent on the forms; nobody with legal standing has answered. Keeping the sheet
   costs nothing to build and leaves the question open; moving the rows to Fonnus-BE's own
   database removes the question at the cost of waiting for that server.
   **Recommendation: ask before the forms go live on the public site.** **Default if
   undecided:** the forms stay as built and this stays open.
5. **Which Google account owns the lead sheet.** It is a personal Gmail account for now, by
   the owner's call. A company account removes the dependence on one person, at the cost of
   a redeploy with a new key and, if that account's organization forbids service account
   keys, a change of credential (ADR 0005 §Revisit). **Default if undecided:** the personal
   account stays.

## Backlog

- **Server-render tests for the content the landing page hides by state** (S, waits on the
  go-ahead for a new kind of test): render `PlanPrice` and `CallDemoPlayer` with
  `react-dom/server` under Vitest and assert that the output holds, for every paid plan in
  `PLANS`, both periods' price and note strings, and for each of the three sample calls every
  turn's text and the action card — with the not-yet-shown items carrying their hiding class
  and the price blocks their `sr-only` label. It would stop a future change from bringing back
  a render that only shows what the visitor has reached, which hid the annual total and the
  transcripts from crawlers that run no JavaScript. The repo has no component test yet, so it
  is a decision, not a chore.
- **Quote markup for the testimonials once they are real** (S): the six quotes in "Mười phòng
  khám đầu tiên" are placeholders, so they stay plain `<p>` + attribution on purpose — a
  `<figure>`/`<blockquote>`/`<figcaption>` would tell a crawler they are attributed quotes.
  When real clinics replace them, switch `src/features/marketing/sections/testimonials.tsx` to
  that markup in the same change.
- **The text of the two legal pages** (M, waits on the text): the footer's "Chính sách bảo
  mật" and "Điều khoản dịch vụ" link to `/chinh-sach-bao-mat` and `/dieu-khoan-dich-vu`,
  which today say only that the document is being finalised and whom to ask, and are kept
  out of search with `noindex`. Once someone with legal standing supplies the text, it
  replaces the body of `src/features/marketing/legal/legal-notice-page.tsx`, the `robots`
  metadata on both pages is removed, and `/dang-ky` (F1b) links the same terms. The privacy
  policy is tied to decision 4 above (the lead forms and PDPL).
- **A sample call whose recording stalls mid-call** (S): on the landing page's "Khả năng",
  a recording that has started and then stops downloading holds the transcript with it and
  keeps showing as playing; the visitor has to pause and press ▶ again, which falls back to
  the silent transcript if the file still does not play. A watchdog that turns such a run
  silent from where it stopped would remove the dead wait. Not built because nobody has
  seen it happen; worth doing if a phone on a weak connection shows it.
- **The first live append of the lead forms** (owner's setup, then S): create the Google
  Cloud project, the service account key and the two-tab spreadsheet as `README.md` lists,
  put the rate limit on `/api/leads*` in the Vercel Firewall, set the three variables, then
  send each form once with `NEXT_PUBLIC_API_LIVE_GROUPS=leads`. That run settles what ADR
  0005 still assumes: that sharing the sheet with the service account lets it append, that a
  personal Google account can create the key, and that a private key pasted with literal
  `\n` is accepted. It is also the first time either endpoint answers a real request; until
  then the `415`, `413`, `422`, `503` and `429` answers are verified by reading and by unit
  tests only.
- **A late append can duplicate a lead** (S, only if it happens): when Google accepts a row
  after the handler's 12-second deadline, the visitor is told the send failed and may send
  again. The `request_id` column makes duplicates of a hotline report visible; the contact
  tab has none.

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
  and the marketing header open `/dang-ky` and `/dang-nhap`. `buttonClassName` in
  `src/design-system/button.tsx` is the class a `Link` can wear (the pricing cards use it);
  what remains is switching those two callers to it.
- **`/dang-nhap` reads browser storage while rendering** (S): `sign-in-page.tsx` calls
  `readLastMethod` inside `useState`, so after one sign-in the server renders no "Lần trước"
  badge and the browser does, and React reports a hydration mismatch. Read it through
  `useSyncExternalStore` with a server snapshot of `null`, as `src/session/session.ts` does.
  Belongs with F1b, which reworks the sign-in doors.
- **The button press snaps instead of easing** (S): `src/design-system/button.tsx` transitions
  `background-color` and `transform`, but Tailwind v4's `active:scale-[…]` sets the separate
  `scale` property, so the press shrink jumps in one frame. Add `scale` to the transitioned
  properties; every button on every surface changes with it, so it wants its own look.
- **Base-palette names in components** (M): about twelve uses of `--milk`, `--blush`,
  `--terracotta`, `--night` in `src/features/auth/sign-in-panel.tsx`, `field.tsx`,
  `otp-field.tsx` and `src/design-system/button.tsx` (its `inverse` variant reads `--night` and `--cream-night`); `src/design-system/icon.tsx` falls back to `var(--terracotta)`. Each needs an alias line in
  `globals.css` `@theme` and then the class; ADR 0002 point 2 forbids the base names.
- A token-copy test, in the shape of `../Fonnus-Admin/src/styles/tokens.test.ts`, asserting
  the six token files are byte-identical to their source in `../Fonnus-Web-UI`.
- An SSR regression test: import `src/api/index.ts` in a Node environment with no `window`
  and assert it does not throw.
- Every use of `src/ui/placeholder.tsx` is a screen that does not exist yet. Deleting the
  last one closes this roadmap; `grep -rl Placeholder src/app` lists them.
- `../Fonnus-Admin` pins its token copies against `../Fonnus-Web-UI`. When that prototype is
  fully retired, both repos need to agree on a new source.
