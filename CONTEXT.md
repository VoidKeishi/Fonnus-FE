# Fonnus-FE — Product, Users, Constraints

## What this is

The customer-facing frontend of Fonnus (`../Fonnus`), the AI voice receptionist that
answers the phone for Vietnamese clinics. Three surfaces, one application:

1. **The landing page** — what Fonnus is, what it costs, and a way to be contacted, plus
   the "Chấm điểm hotline" page, which offers a free report on how many of a clinic's calls
   go unanswered, and the waitlist page, where a clinic leaves its details while the
   product opens in batches. This is an acquisition surface: clinics will find it by
   searching, so it is server-rendered.
2. **Sign-up and sign-in** — a phone number and a code, or an email, or Google. No password
   anywhere in the product.
3. **The signed-in app at `/app`** — where a clinic owner configures their receptionist
   (the **Lễ tân** tab: who the clinic is, what it knows, what it is allowed to do), sees
   the calls it has answered, and manages their phone number and account.

It owns no data. Everything it shows comes from `../Fonnus-BE` over HTTP (ADR 0003); the
call pipeline itself is never contacted directly. The one thing it receives itself is the
three marketing forms — the contact request, the hotline report request and the waitlist
sign-up — which it appends to a Google Sheet the team works from (ADR 0005).

The design comes from `../Fonnus-Web-UI`, a complete Vite prototype of this same product.
That repo is the absolute authority on how the product looks and behaves, and is now frozen:
its architecture and patterns are deliberately not inherited, only its design (ADR 0002).

## Users

One person: the owner of a Vietnamese clinic. Alone, usually in a hurry, often on a phone.
They are not exploring a product — they are answering questions so the receptionist can do
its job. Every rule in `docs/ui-ux-principles.md` follows from that sentence.

They are not the user of `../Fonnus-Admin`, which is the internal console for the team
tuning the pipeline. Different person, different repo, same design system.

## What the app shows

`PLAN.md` says what exists today; this is the target.

| Surface | Path | Holds |
|---|---|---|
| Landing | `/` | Hero with a live voice demo, how it works, pricing, contact |
| Chấm điểm hotline | `/cham-diem-hotline` | The free report: Fonnus rings each of the clinic's locations as a patient would and scores the calls. For owners, often of a chain, who are not ready for a receptionist yet |
| Danh sách chờ | `/waitlist` | Name, phone and email of a clinic waiting its turn. Every "join" call to action on the marketing pages lands here while the product opens in batches; there is no self-serve sign-up and no sign-in entry on the marketing pages |
| Sign-up / sign-in | `/dang-ky`, `/dang-nhap` | One flow: an existing number turns a sign-up into a sign-in |
| Tổng quan | `/app` | The shape of the week: calls answered, what needs attention |
| Cuộc gọi | `/app/cuoc-goi` | The clinic's own call history — the same read path as Fonnus-Admin with a tenant filter |
| Lịch hẹn | `/app/lich-hen` | Appointments the receptionist took |
| Lễ tân | `/app/le-tan/{ho-so,kien-thuc,ky-nang}` | The receptionist's identity, its knowledge, and its permitted skills — about 60 configuration fields across 13 forms |
| Số điện thoại | `/app/so-dien-thoai` | The number that rings into Fonnus |
| Cài đặt | `/app/cai-dat` | Account, plan, billing |

Not here: anything the internal team uses (that is `../Fonnus-Admin`), and any write into
pipeline-owned data (forbidden by `../Fonnus/docs/adr/0013-repo-boundaries.md` — it goes
through Fonnus-BE).

## Constraints

### Language

Every word a user reads is Vietnamese, and the frontend owns all of it. The backend returns
machine-readable error codes; `src/api/errors.ts` turns them into sentences. An English
string reaching the screen is a bug, not a missing translation.

Everything written down — code, comments, documents, commit messages — is English. This is
the rule in all four Fonnus repos.

Vietnamese is also why the three fonts are what they are: Baloo 2, Be Vietnam Pro and IBM
Plex Sans are loaded with the `vietnamese` subset, without which accented glyphs fall back
mid-word.

### Vocabulary belongs to the pipeline

Turn, leg, mark, consent outcome, end reason, DID, artifact state — these are defined in
`../Fonnus/PIPELINE_ARCHITECTURE.md` and used here unchanged. This repo coins no term for a
pipeline concept; a Vietnamese screen label is a rendering of a pipeline term, never a new
one. Configuration field names come from `../Fonnus/docs/context-field-catalogue.md`, frozen
here as `docs/context-field-catalogue.v1.md` and mapped in `docs/field-catalogue-mapping.md`.

### Legal, and visible on screen

- **AI disclosure (Law 134/2025/QH15).** The caller must be told they are speaking to an AI.
  This is a legal requirement, not a UX choice: the disclosure script is a configuration
  field the owner can word but not remove, and the screen says so.
- **PDPL (Law 91/2025/QH15) and Decree 356/2025/ND-CP.** Transcripts and health details are
  personal data. The app renders consent outcomes; it never decides them, and it never shows
  caller-derived text that consent did not cover.
- **Cloudflare Turnstile on the voice demo (ADR 0009).** After the visitor taps the orb and
  the consent slot opens, Cloudflare's Turnstile script loads and sends their IP address,
  TLS fingerprint and User-Agent to Cloudflare, for bot detection only, before any ticket
  is minted. Nothing the visitor says or types goes there, and the call screen does not
  change. A browser that blocks `challenges.cloudflare.com` cannot start the demo and is
  told it could not connect.

### The secrets, and none reaches the browser

Every `NEXT_PUBLIC_*` value is inlined into the JavaScript the browser downloads, so none of
them is a secret. The session is an httpOnly cookie the browser holds and this code never
reads. The secrets are server-side variables of the host, read only in `src/server/env.ts`
and only inside a route handler: the Google service account key that lets the lead route
handlers append to the sheet (ADR 0005), the ElevenLabs API key that mints the voice demo's
tickets (ADR 0006), the key that signs the voice demo's budget cookie, and the Turnstile
secret that verifies a visitor's challenge before a ticket is minted (ADR 0009). `.env*` is gitignored; `.env.example` is the list of what
exists, with no values.

### Personal data in the lead sheet

The three marketing forms collect a contact's name, phone and email, and this app stores them
in Google Sheets. Whether that is a cross-border transfer of personal data under PDPL is an
open question with no answer yet; `PLAN.md` carries it.

### Look and feel

The design system is copied from `../Fonnus-Web-UI` (ADR 0002): tokens verbatim, components
rebuilt in Tailwind. A warm cream ground, rounded cards, one terracotta accent for anything
clickable, drawn icons with a single accent stroke, sentence case everywhere, no dark mode.
The rulebook is `docs/ui-ux-principles.md` and it is a living document — read it before
redesigning a screen, and add to it after.

## Stack

| Layer | Choice | Why (full rationale: `docs/adr/0001-stack.md`) |
|---|---|---|
| Framework | Next.js 16, App Router, React 19, TypeScript strict | Server-rendered marketing surface, client app behind it, one deployable |
| Styling | Tailwind CSS v4 over copied design tokens | Same shape as `../Fonnus-Admin`, so a screen can move between the repos |
| Data | `fetch` in the browser against Fonnus-BE, behind `src/api/` | No database, no server-side fetching, no backend-for-frontend (ADR 0003). The exception is the two lead route handlers, which write to a Google Sheet (ADR 0005) |
| Toolchain | pnpm 11, Node 22, ESLint flat config with `strictTypeChecked`, Vitest | Same as `../Fonnus/app` and `../Fonnus-Admin` |

Four runtime dependencies: `next`, `react`, `react-dom`, and `@elevenlabs/client` for the
landing page's live voice demo, loaded on the first click of the orb and never with the page
(ADR 0006). The HTTP client, the error type, the mock layer and the icons are hand-written.

## Deployment

The host is Vercel: the owner's choice, and the premise ADR 0005 rests on, because the lead
route handlers run as functions there and the project holds the Google key. The production
domain is `fonnus.ai`, attached to that Vercel project; it is the `metadataBase` every
share link resolves against. The rest is not decided: the environments, CI, and the cookie
posture towards Fonnus-BE once it exists. Those wait for their own ADR; `PLAN.md` carries
the row.
