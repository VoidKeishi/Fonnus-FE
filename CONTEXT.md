# Fonnus-FE — Product, Users, Constraints

## What this is

The customer-facing frontend of Fonnus (`../Fonnus`), the AI voice receptionist that
answers the phone for Vietnamese clinics. Three surfaces, one application:

1. **The landing page** — what Fonnus is, what it costs, and a way to be contacted. This is
   an acquisition surface: clinics will find it by searching, so it is server-rendered.
2. **Sign-up and sign-in** — a phone number and a code, or an email, or Google. No password
   anywhere in the product.
3. **The signed-in app at `/app`** — where a clinic owner configures their receptionist
   (the **Lễ tân** tab: who the clinic is, what it knows, what it is allowed to do), sees
   the calls it has answered, and manages their phone number and account.

It owns no data. Everything it shows comes from `../Fonnus-BE` over HTTP (ADR 0003); the
call pipeline itself is never contacted directly.

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

### Nothing here is secret

Every `NEXT_PUBLIC_*` value is inlined into the JavaScript the browser downloads. The
session is an httpOnly cookie the browser holds and this code never reads. `.env*` is
gitignored; `.env.example` is the list of what exists.

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
| Data | `fetch` in the browser against Fonnus-BE, behind `src/api/` | No database, no server-side fetching, no backend-for-frontend (ADR 0003) |
| Toolchain | pnpm 11, Node 22, ESLint flat config with `strictTypeChecked`, Vitest | Same as `../Fonnus/app` and `../Fonnus-Admin` |

Three runtime dependencies: `next`, `react`, `react-dom`. The HTTP client, the error type,
the mock layer and the icons are hand-written.

## Deployment

Not decided. Fonnus-Admin runs on the same VPS that answers the phone, behind Caddy with
basic auth; this is a public site for customers and the security posture is different
enough that it deserves its own decision. Nothing is deployable yet, so the decision waits
for a later ADR. `PLAN.md` carries the row.
