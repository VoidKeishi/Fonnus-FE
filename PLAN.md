# Fonnus-FE — Plan

The single live tracker for this repo. Updated in the finishing commit of every task.
Status: ⬜ not started · 🔨 in progress · ✅ done, with the date.

## Roadmap

| Step | Status | Notes |
|---|---|---|
| **F0 · Scaffold** — Next.js 16 App Router, pnpm, strict TypeScript, ESLint, Tailwind v4 over the copied tokens, the three fonts through `next/font`, assets moved, docs written, `src/api/` seam with the `auth` group | ✅ 2026-09-15 | Every route in the design exists; the ones that are not built say so through `src/ui/placeholder.tsx` |
| **F1 · Sign-in** — `/dang-nhap` with the phone and email code flows, `SessionProvider`, the demo login as the acceptance test | ✅ 2026-09-15 | Two of the three doors. Google sign-in and the whole of `/dang-ky` are F1b below |
| **F1b · Sign-up and Google** — `/dang-ky` (clinic name, the Terms line, an existing number turning a sign-up into a sign-in) and Google on both doors: the in-page chooser for mock mode, the OAuth redirect for live | ⬜ | `/dang-ky` is a placeholder today, and since F4f nothing links to it: every marketing call to action goes to `/waitlist`, so this step is also the decision to reopen self-serve sign-up. The hero no longer hands a phone number over (`sign-up-handoff.ts` was deleted with its only writer); re-add a hand-off here if the hero gets a number field back. Google needs `googleAuthUrl()` pointed at a real endpoint, so it waits on `../Fonnus-BE` |
| **F2 · The app shell** — `/app` layout: 216px sidebar, icon rail at ≤900px, bottom tab bar on phones; the session and toast providers | 🔨 | The frame, the nav and the session gate are in place (`src/shell/`, `src/session/`); the toast provider and the readiness dot on Lễ tân are not. Everything under `/app` is client-rendered by design (CLAUDE.md) |
| **F3 · Lễ tân** — the hub and the three tabs (Hồ sơ, Kiến thức, Kỹ năng), the shared section frame, the save stack, the try-out panel. Brings `src/features/receptionist/model.ts` and `docs/field-catalogue-mapping.md` into force | ⬜ | The largest single step: ~60 fields across 13 forms |
| **F4 · Landing page** — the landing page at `/` and the "Chấm điểm hotline" page at `/cham-diem-hotline`, ported from `../Fonnus-Web-UI` in nine stacked pull requests: the marketing frame, the hero, the voice orb and its call demo, pricing, how it works, capabilities, FAQ with security and testimonials, the contact form against `POST /leads`, and the hotline page against `POST /leads/hotline-report` | ✅ | Server-rendered; this is the acquisition surface. The header reads no session; since F4f its one action is "Danh sách chờ" (the prototype's "Đăng nhập" and "Dùng thử miễn phí" are gone). The call demo goes through the `voice` group since F4c. A nav or footer link appears only in the pull request that lands its section |
| **F4b · Leads to a Google Sheet** — the contact form and the "Chấm điểm hotline" request stop waiting on `../Fonnus-BE`: this app receives them in two route handlers and appends them to a Google Sheet (ADR 0005). Four stacked pull requests: the decision, `POST /api/leads`, `POST /api/leads/hotline-report`, then both forms switched to them | ✅ 2026-09-30 | Built and gated by typecheck, lint, test and build only: no request has reached a real sheet yet. `NEXT_PUBLIC_API_LIVE_GROUPS=leads` turns both forms live at once. What remains is the owner's setup and the first live append; see Backlog |
| **F4c · The voice demo answers** — the "Nghe thử" orb opens a real three-minute conversation with a private ElevenLabs agent, as a stand-in for the pipeline behind the `voice` seam (ADR 0006). Four stacked pull requests: the decision, the `voice` seam with today's recording as its scripted implementation, `POST /api/voice-demo/token`, then the live implementation and the call screen's new states | ✅ 2026-10-11 | Built and gated by typecheck, lint, test and build only: no live call has been made yet, and no browser has opened the new states. `@elevenlabs/client` loads on the first tap, never with the page. `NEXT_PUBLIC_API_LIVE_GROUPS=voice` plus the two server variables turn it on; what remains is the owner's setup and the first live call (Backlog), which also settles the assumptions ADR 0006 lists |
| **F4d · The voice demo is agent-only, with a text fallback** — the recorded greeting and the scripted session are deleted; `voice` is the one group with no mock; a connection that fails is said on screen; a visitor whose browser gives no microphone talks to the same agent by typing (ADR 0007) | ✅ 2026-10-11 | Two stacked pull requests: the decision with the recording removed, `voice` always live and the failed-connection state; then the text session and the text-shaped call screen. Gated by typecheck, lint, test and build only: no text session has been run against ElevenLabs yet, which is what settles the four assumptions ADR 0007 lists. The owner enables the Text-only override (Backlog) |
| **F4e · What a crawler is told** — `robots.txt` (every bot welcome, `/api/` and `/app/` disallowed), `sitemap.xml` (the public, indexable, built pages: `/` and `/cham-diem-hotline`), and a canonical on each of the six public pages, so a preview deployment is never indexed as a second site. The production origin moves to `src/data/site.ts`. Then `/llms.txt`, static, in Vietnamese with one English line, rendered from `src/data/` (the pages, the navigation, the plans, the FAQ, the contact details) so it cannot say anything a page does not; `llms-txt.test.ts` pins what it carries and that it never renders a missing value. Then JSON-LD on the marketing pages: `Organization` and `WebSite` on every one, `Product` (seven `Offer`s, the display prices parsed to numbers at build time) and `FAQPage` on `/`, every value from `src/data/`, four `<script type="application/ld+json">` blocks on `/` and two elsewhere, nothing visible changed | ✅ 2026-10-13 | Gated by typecheck, lint, test, build and a fetch of every output from `pnpm start`. The landing page was already server-rendered with every state's text in the HTML — both billing periods, every FAQ answer, the full comparison table, the demo transcripts — which is verified on the built HTML, not only read in the code. The `Product` carries no `review`: it shipped with the three testimonials as `Review`s for one day, and the Rich Results Test on the live site flagged a critical issue — Google requires a `reviewRating` on each review and an `aggregateRating` once there is more than one, and the page shows no rating to take either from, so the only honest fix was to remove them. Reviews return with the testimonials row of the Backlog, which now also needs a visible rating. `llms.txt` is a bet with no measured upside yet: Google says it does not read it, and OpenAI and Anthropic have not said they do |
| **F4g · Three minutes an hour** — the voice demo's three minutes become a budget per browser per hour, spent over any number of calls (ADR 0008, amending ADR 0006 point 6): a ledger in `localStorage` under `src/features/marketing/orb/call-budget.ts`, `VoiceApi.connect` takes `maxDurationMs`, the consent slot says what is left, and a spent hour shows when it is back with no "Gọi lại" | ✅ 2026-10-15 | Gated by typecheck, lint, test and build; the new slots have not been opened in a browser (see the pull request's "worth a look"). Browser-side only at the time, by the owner's decision; superseded by F4h on 2026-10-18, which moved the count to the server. The screen and its sentences are F4g's and did not change |
| **F4f · Danh sách chờ** — the marketing pages switch from "sign up for a free trial" to "join the waitlist": `/waitlist` (name, phone, email; a night panel beside the form; the sign-up stored as a third tab of the leads sheet through `POST /api/leads/waitlist`, ADR 0005 point 7), the hero's phone pill replaced by one "Vào danh sách chờ" button, the header's two buttons replaced by one "Danh sách chờ" button with the mark whose arc hops, and every `/dang-ky` link on the marketing pages and the sign-in page pointed at `/waitlist`. `/waitlist` joins `SITE_PAGES`, so the sitemap and `/llms.txt` list it. Designed from the owner's reference page `.examples/Fonnus Danh sách chờ.html`, which is a local file kept out of the repository (`.git/info/exclude`), not from the prototype; the port was hand-checked by the pm at 1440px and 375px | ✅ 2026-10-14 | Two stacked pull requests: the page and its endpoint, then the entry points. Gated by typecheck, lint, test, build and a browser walk of the form, the thank-you state and the demo login; the `waitlist` tab needs creating in the sheet (README step 3) before the first live sign-up. Deliberate differences from the reference: the phone field keeps the sign-in door's `+84 │ 090 123 45 67` convention and does not group digits while typing (the reference shows `90 123 45 67` and groups as you type — a mobile-only rule that would mangle a fixed line); the error lines are the contact form's, not the reference's; no "Đã dùng Fonnus? Đăng nhập" link on the page, and the sign-in page's top-right link is only "Vào danh sách chờ" (owner's decisions); the sign-in footnote now shows the landing page's support number `+84 914 378 064 (gọi hoặc Zalo)` instead of the prototype's `024 7307 7199`, so the product has one number |
| **F4h · The hour is kept by the server** — the three-minute budget of F4g leaves the browser (ADR 0009, amending ADR 0006 point 6 and superseding ADR 0008 points 4 and 6): a signed `httpOnly` cookie written by `POST /api/voice-demo/token`, charged the whole remainder at each mint and refunded from ElevenLabs's conversation list; `GET /api/voice-demo/budget` for the screen's numbers; `429 { code: "budget_spent", resets_at }` when the hour is spent; then every mint behind an invisible Cloudflare Turnstile check, fail closed, with the IP-to-Cloudflare line in `CONTEXT.md` §Legal. No IP as identity (the sales demo runs several devices behind one address), no store, no fingerprint, no new dependency. Three stacked pull requests: the single-use signed URL, the cookie budget with the ADR, then Turnstile | ✅ 2026-10-18 | Gated by typecheck, lint, test and build only: no live mint has run against the new routes and no browser has opened the new timings (each pull request's "worth a look"). The reviews found and the build fixed: an ending flipping to spent and back while ElevenLabs still listed the call as in progress (now one read five seconds after hang-up), a lost-update race between `GET /budget` and a quick tap, unreadable list rows refunding a whole call, `Secure` dropping the cookie over LAN http in development, and the Turnstile widget rendering inside the tap's fifteen seconds. Still assumed until a live call (ADR 0009 §Assumed): the signed URL's `conversation_id`, the API key's permission to list conversations, a hang-up leaving `in-progress` within five seconds, the lazily loaded widget on a phone. The owner's setup — the three agent limits, the Turnstile widget, five variables — is the Backlog row |
| **F4i · The call counts down** — while a session runs, voice or typed, the call screen shows `2:39 / 3:00` under "Nha khoa Minh Anh · bản mô phỏng": what is left of the hour's three minutes, counting to `VoiceSession.endsAt`, the moment the session's own cap ends it (ADR 0010, the owner's decision, superseding ADR 0008's "no countdown"). The budget and the client's cap become exactly 180 s and the agent's `max_duration_seconds` 190, so a full hour opens on `3:00`. The line's row is kept from the first frame so the orb stays on its slot; a screen reader hears "Còn 30 giây gọi thử." once | ✅ 2026-10-18 | Gated by typecheck, lint, test and build only: no browser has watched a countdown run to its cut, and no screen reader has heard the warning (the pull request's "worth a look"). The owner raises `max_duration_seconds` to 190 before deploying (Backlog row); until then the agent cuts first and the countdown stops at about `0:01` |
| **F4j · No speaking or listening line** — a voice call's line under the orb no longer says "Fonnus đang nói" or "Fonnus đang nghe" (the owner's decision): both came from the ElevenLabs SDK's mode change, which lags her voice, so the line often said she was speaking after she had stopped. The line keeps "Đang kết nối…" and, now whatever her mode, "Micro đang tắt — bạn có thể gõ chữ"; it keeps its height while empty, so the orb stays on its slot. The typed conversation's lines are unchanged | ✅ 2026-10-18 | Gated by typecheck, lint, test and build. A deliberate difference from the prototype, which drew the two sentences |
| **F4k · Chips that follow the conversation** — the call screen's three fixed suggestion chips become the product owner's tree (`.examples/fonnus-demo-prompt-tree.md`, kept out of the repository, copied word for word into `CHIP_TREE` in `src/data/call-demo.ts`): three opening questions, each leading to three follow-ups, four levels and 120 chips. A chip that reaches the session fades its set out and the next fades in (`--duration-base` out, `fnFadeIn` over `--duration-slow` in, instant under reduced motion); a chip sent is never offered again in that call, by its words; the last level, or a set already all sent, leads back to the first set; typing or speaking keeps the set; "Gọi lại" starts over | ✅ 2026-10-18 | Gated by typecheck, lint, test and build only: no browser has walked the tree. Copied as written, including questions that reach past the clinic data Linh is assumed to have (`../Fonnus/docs/research/minh-anh-faq.json`), such as promotions, All-on-4, implant warranty and medical advice; whether she answers them well is for a live call to show |
| **F4l · The dotted field carries her voice** — the call screen's three waveform rings around the orb are gone. Chấm nhịp behind the orb is drawn on a canvas (`orb/dot-field.ts`) and moved by the orb's one animation loop: silent, it rests close around the orb; as she speaks a slow envelope (260 ms in, 900 ms out) opens it to about three orb radii and pushes the dots near the orb outward, and a syllable well above her own level sends a ripple that moves the dots and never brightens them. Only her real voice moves it: a typed conversation and reduced motion leave it at rest. It now shows on phones too. Both envelopes are measured in time, not frames | ✅ 2026-10-18 | Gated by typecheck, lint, test and build only: no live call has moved the field yet. The loudness that opens it fully (0.6 of the SDK's output volume) is ASSUMED; every tuning number is a named constant in `orb-motion.ts` for the owner and the product owner to set by eye. The field is centred on the orb's slot when the slot changes size, so it shares the Backlog's "slot moves without resizing" caveat. Superseded by F4n on 2026-10-22: the field is still again and the aura carries her voice |
| **F4m · No voice animation in a typed conversation** — the orb's synthetic 1.1 Hz pulse, which stood in for her loudness while she answered in a typed conversation, is gone (the product owner's decision, on trial): only a real voice moves the orb now, as it moves the dotted field, and a typed conversation leaves both still. Reduced motion still holds the orb at a fixed swell while she speaks in a voice call | ✅ 2026-10-18 | Gated by typecheck, lint, test and build only. Stacked on F4l as its own pull request, so the trial can be dropped without touching the field |
| **F4n · A volumetric aura carries her voice** — on the call screen her voice is a soft aura behind the sphere (`orb/aura.ts`), drawn by the orb's one animation loop on a small blurred canvas inside the orb's button, so it scales with the orb: a near layer, seven lobes that each drift on their own 6–15 s cycle and answer her loudness by a different amount, and a diffuse haze, in the orb's own clay, amber and cream. Her loudness is smoothed (110 ms in, 380 ms out) and shown 1.45 times as strong; a syllable well above her own level swells one or two lobes for 420 ms. The aura fades in once the orb has landed and is cut the moment it leaves, so it never crosses the hero. The sphere no longer swells with her voice and only brightens by up to 3%. Chấm nhịp stops moving: it is the dots pattern again, still, inside the orb's slot, so it stays centred in the typed layout too. Reduced motion holds the lobes still; the aura's opacity and the sphere's 3% brightness still follow her voice, which replaces F4m's fixed swell. Designed from the owner's written brief, with `.examples/volumetric_aura_orb_demo_max_intensity.html` as a reference for colour and intensity only: its rotating masked ring is the one thing the brief forbids | ✅ 2026-10-22 | The owner's decision: one picture of her voice, and the brief puts the background in the ambient layer, so the moving dots and their ripples, which read close to the concentric rings the brief forbids, were dropped four days after F4l. The noise floor and gain are set from the volume spread of one live call, on which the owner checked by eye that the aura shows at once while she speaks, never reads as a ring, and is not cut at 375px. That check was of the build before the gain was tuned. Because the aura is in the orb's layer, it paints over the call screen's text while she speaks: a faint amber tint on the state line under the orb and on the top of a typed thread's first bubble. The owner accepted this after moving the aura under the text left it off-centre. The peak thresholds keep F4l's numbers on the tuned loudness (ADR 0006 §Assumed). Gated by typecheck, lint, test and build |
| **F5 · Cuộc gọi** — the clinic's own call history | ⬜ | Blocked: `GET /calls` is "specified later" in `docs/api-contract.md` §7 and has no agreed shape |
| **F6 · Lịch hẹn, Số điện thoại, Cài đặt** | ⬜ | |
| **F7 · Deployment** — an ADR on how this runs on Vercel: the environments, CI, and the cookie posture towards Fonnus-BE | ⬜ | The host is Vercel (the owner's choice, and the premise of ADR 0005) and the production domain is `fonnus.ai`; everything else is undecided. The build SHA on `/api/healthz` waits here |

## Waiting on ../Fonnus-BE

Fonnus-BE is an empty directory today. Every group below is faked in the browser until it is
not; `NEXT_PUBLIC_API_LIVE_GROUPS` switches them on one at a time. The questions behind each
row are in `docs/open-questions.md`; the shapes are in `docs/api-contract.md`.

| Group | Endpoints | Unlocks | Status |
|---|---|---|---|
| `auth` | `POST /auth/otp`, `/auth/otp/email`, `/auth/otp/verify`, `GET /me`, `PATCH /me`, `POST /auth/signout` | A real sign-in instead of the demo account | ⬜ Declared in `src/api/contracts.ts`, mocked |
| `tenant` | `GET`/`PATCH /tenant/config`, `POST /tenant/config/reset` | F3 against real data | ⬜ Not declared yet |
| `knowledge` | `POST`/`DELETE /tenant/knowledge-files` | Knowledge file upload in F3 | ⬜ Not declared yet |
| `voice` | `POST /tts/preview`; the web voice gateway that replaces the ElevenLabs stand-in behind `voice.live.ts` | Hearing the receptionist speak; the landing demo through the pipeline, the gateway keeping the hour's three-minute budget per caller in its own store and answering the same `429` and `GET /budget` shapes this app's routes answer today (Q21, ADR 0009) | ⬜ Not declared yet |
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
2. **How Fonnus-FE runs on Vercel** — the host and the domain (`fonnus.ai`) are chosen; the environments and
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

4. **Whether a contact's name, phone and email may sit in Google Sheets.** The three marketing
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

- **The voice picker comes back when the agent has a second voice** (M): the call screen's
  "Chọn giọng nói của trợ lý" menu with its five names was removed in F4c because the
  ElevenLabs agent has one voice and the control changed nothing (ADR 0006 point 10). When a
  second Vietnamese voice exists, the menu returns mapped to voice ids through
  `overrides.tts.voiceId`, and the five names are reconciled with the four ids of
  `docs/field-catalogue-mapping.md`.
- **The owner's setup for the live voice demo** (owner's setup, then nothing; `README.md`
  §Turn on the live voice demo is the checklist): in the ElevenLabs dashboard,
  `max_duration_seconds` = 190 with its override **off** (on, a client picks its own call
  length), `bursting_enabled` **off** (its default lets calls exceed the workspace
  concurrency at double the price), `agent_concurrency_limit` around 5 (its default is
  unlimited), Authentication on with an empty allowlist, audio and transcript retention off
  under Privacy, the **Text-only mode** override enabled under Security (or the text session
  of a visitor without a microphone is refused), a first message that says it is an AI and
  does not say the call is recorded, a closing line around 2:50, and a turn timeout long
  enough to type a sentence (the first text session ended on the 7-second default); in
  Cloudflare, one Turnstile widget in Invisible mode for `fonnus.ai` and the preview
  hostnames; in Vercel, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`,
  `VOICE_DEMO_COOKIE_SECRET`, `TURNSTILE_SECRET_KEY` as Sensitive variables and
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a plain one. The three agent limits and the four
  variables are what ADR 0009 depends on; the rest was ADR 0006–0008's.
- **The Vercel Firewall rate-limit rule** (owner's setup, deferred): the Hobby plan allows
  one rate-limit rule per project, so it is one rule over both `/api/leads*` and
  `/api/voice-demo/token`, keyed on IP, with a window of at most ten minutes. Deferred by the
  owner on 2026-10-18: there are no customers yet, the sales demo runs several devices behind
  one address, and ADR 0009 made the budget cookie and Turnstile the protection of the token
  route. Add it the day the agent's logs show mints the budget does not stop; a per-IP
  counter in a shared store is the step after that, and both are ADR 0009's revisit triggers.
- **"Nhắn tin thay vì gọi" as a choice on the consent screen** (S, after the first live text
  session): today a text session is a consequence of the browser giving no microphone (ADR
  0007). A button beside "Bắt đầu gọi" would let a visitor in a quiet room choose text
  outright; it changes the consent screen the prototype drew, so it waits for a reason
  observed on a real visitor.
- **Grouping a callback number as it is typed** (S, only if asked for): the waitlist and
  contact forms keep the raw text while typing because `formatPhone` is a mobile-only
  rule — it cuts the eleventh digit of a fixed line and puts a 0 in front of a 1900
  number. A `formatCallbackNumber` in `src/api/phone.ts` (mobile 3-3-2-2, fixed line
  3-4-4, hotline untouched) with tests would let both inputs group live, as the waitlist
  reference page does.
- **The transcript line shape exists twice** (S): `src/features/marketing/sections/call-demo-player.tsx`
  and the thread of the call screen's text shape (`call-overlay.tsx`, `ThreadTurn`) carry
  the same speaker-label-plus-line classes. Moving them to one shared place in the marketing
  feature needs an entry in `docs/architecture.md`; do it the next time either changes.
- **Vercel's Hobby plan is for non-commercial use** (F7): the landing page sells a product,
  which Vercel's terms place outside Hobby. Not a code question; it belongs to the deployment
  ADR and is noted here so F7 does not forget it.
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
  that markup in the same change. Only then may the landing page's `Product` JSON-LD carry
  them as `Review`s — and only if a rating is collected and shown on the page: Google
  requires a `reviewRating` per review and an `aggregateRating` once there are several, and
  a rating that is not visible on the page is fabricated (F4e tried reviews without one and
  the Rich Results Test rejected them).
- **The text of the two legal pages** (M, waits on the text): the footer's "Chính sách bảo
  mật" and "Điều khoản dịch vụ" link to `/chinh-sach-bao-mat` and `/dieu-khoan-dich-vu`,
  which today say only that the document is being finalised and whom to ask, and are kept
  out of search with `noindex`. Once someone with legal standing supplies the text, it
  replaces the body of `src/features/marketing/legal/legal-notice-page.tsx`, the `robots`
  metadata on both pages is removed, both paths join `SITEMAP_PATHS` in `src/data/site.ts`,
  and `/dang-ky` (F1b) links the same terms. The privacy policy is tied to decision 4 above
  (the lead forms and PDPL).
- **The orb may drift off its slot when the slot moves without resizing** (S, only if seen):
  on the call screen, going from consent to connecting, and from connecting to an ending,
  changes the height of the slot's column inside a centred grid, so the orb's slot can move
  while keeping its size — which `use-orb-placement`'s ResizeObserver does not see. Nobody
  has watched it happen; if the orb sits off its slot after "Bắt đầu gọi", the placement
  hook needs to re-measure on the slot's position too (one more observer, or a measurement
  on each slot swap).
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
- **A link styled as a button** (S): `<Link><Button>` puts a `<button>` inside an `<a>`, which
  is invalid HTML and gives a screen reader two controls for one. The marketing header was
  fixed by F4f (its one button is a `Link` wearing `buttonClassName`); what remains is any
  such nesting on the auth pages (`grep -rn "<Link" src/features/auth` and look for a
  `<Button>` child).
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
