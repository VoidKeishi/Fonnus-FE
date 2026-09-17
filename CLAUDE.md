# Fonnus-FE

The customer-facing frontend of Fonnus, the AI voice receptionist for Vietnamese clinics:
the landing page, sign-up and sign-in, and the signed-in app where a clinic owner configures
their receptionist and reads its call history. It owns no data — everything comes from
`../Fonnus-BE` over HTTP. Product and constraints: `CONTEXT.md`.

Three sibling repositories, each of which must exist beside this one for a `../X/…` pointer
to resolve:

| Repo | What it is | What it is authoritative for |
|---|---|---|
| `../Fonnus` | The call pipeline (`github.com/VoidKeishi/Fonnus`) | Pipeline vocabulary and the tenant configuration field catalogue |
| `../Fonnus-BE` | The server this app calls | Implementing `docs/api-contract.md` |
| `../Fonnus-Web-UI` | The Vite prototype of this product, now frozen | Nothing any more — its design and its docs moved here |
| `../Fonnus-Admin` | The internal console for the team | The toolchain conventions this repo mirrors |

## Which door

| Situation | Command |
|---|---|
| ALL product work, any size (requirement → port or design → build → acceptance) | `claude --agent pm` |
| Bug investigation, toolchain hand-work, a review or audit the user asks for | plain `claude` |

The personas in `.claude/agents/` (`pm`, `ux-builder`, `code-reviewer`, `explore`) and the
`requirement` skill follow the pipeline repo's orchestrator/executor shape, rewired to this
repo's spine: the frozen prototype `../Fonnus-Web-UI` is the design authority, so there is
no designer persona and no architect — the pm decides what a faithful port is and writes
the rare ADR itself; `ux-builder` ports screens onto the architecture in `docs/adr/`;
`code-reviewer` reviews blackbox; `explore` reads all three sibling trees. Never call
`ux-builder` or `code-reviewer` directly — they are the pm persona's executors and refuse
prompts without their input contracts. Sizing is the pm's: S edits directly · M states the
port and its deltas, one approval, then builds · L writes the decision down in `docs/adr/`
before code.

## Read first, every session

1. `PLAN.md` — where the task fits ("continue" = the 🔨 row, else the first ⬜).
2. `CONTEXT.md` — what the product is, who uses it, and the constraints that are legal
   rather than aesthetic.
3. `docs/api-contract.md` §1 — the cookie and CORS posture. It is the thing a new session
   gets wrong, and the failure looks like "sign-in succeeds and then `GET /me` says
   anonymous".
4. `docs/ui-ux-principles.md` — before designing or redesigning any screen. It is a living
   document: add to it at the end of a session that taught something.
5. `docs/adr/` — four decisions, each with what was rejected and what would reopen it.
6. `docs/architecture.md` — before adding, moving or naming a file under `src/`: the tree,
   the import direction, and the "where does X go" table.

## Ground rules

- **All user-facing copy is Vietnamese, and this repo owns every sentence of it.** The
  backend sends machine-readable codes; `src/api/errors.ts` maps them to words. Everything
  written down — code, comments, docs, commit messages — is English.
- **Vocabulary is the pipeline's.** Turn, leg, mark, consent outcome, end reason, DID,
  artifact state are defined in `../Fonnus/PIPELINE_ARCHITECTURE.md` and used unchanged. A
  Vietnamese screen label renders a pipeline term; it never invents one.
- **Configuration fields are `snake_case`, exactly as the catalogue names them.** No
  camelCase mapping layer between the wire and the model, ever. A field the catalogue does
  not define is marked `[ext]` and gets a row in `docs/field-catalogue-mapping.md` in the
  same commit that adds it.
- **No component calls `fetch`.** Network access goes through `src/api/`, and a change to
  an interface in `src/api/contracts.ts` updates `docs/api-contract.md` in the same commit.
- **This repo reads no database.** No `pg`, no `DATABASE_URL`, no SQL. A need to write
  pipeline data is Fonnus-BE's problem, not a feature here
  (`../Fonnus/docs/adr/0013-repo-boundaries.md`).
- **Only `src/api/env.ts` reads `process.env`,** enforced by a lint rule. Next.js inlines
  only a *literal* `process.env.NEXT_PUBLIC_X`; read through a computed key it is
  `undefined` in the browser and defined on the server.
- **No hex in a component.** Only the alias tokens (`--surface-card`, `--text-muted`,
  `--action-primary`, …) or their Tailwind names. Token files under `src/styles/tokens/` are
  copies: a change there is a re-copy of the whole file, never an edit (ADR 0002).
- **Icons are drawn, not installed** (`src/design-system/icons.ts`), one terracotta accent
  per glyph through `--icon-accent`. No icon library, no emoji in markup.
- **Dependencies are added deliberately.** The runtime list is `next`, `react`, `react-dom`.
  Adding a fourth is a decision with a `PLAN.md` row behind it.
- **Nothing ships ahead of its first consumer** — a contract group, a token, an abstraction
  arrives with the screen that needs it. This is `../Fonnus/docs/adr/0011` applied here.
- A claim about Fonnus-BE or the pipeline is verified against their source or their
  contract, or marked ASSUMED with the observation that would settle it.
- `.env*` is gitignored except `.env.example`. Nothing in this repo is a secret.
- Do NOT commit unless the user asks. End of task = print a ready-to-run commit block:
  explicit `git add <files>` (never `-A`) plus `git commit` per §Commit messages.
- Converse in the language the user writes in; Vietnamese replies keep English technical
  terms in English. Docs record current state only — history lives in git and `docs/adr/`.

## Things that are load-bearing and look like they are not

Carried from the prototype, where each one was a bug first.

- `overflow-x: clip`, never `hidden`. `hidden` makes the ancestor a scroll container and
  silently kills `position: sticky` inside it.
- The runway under the last sticky card is a real element, not padding. A sticky item is
  bounded by its parent's *content* box, which padding does not extend.
- The voice orb is mounted once, at the root of the marketing layout, and never re-mounted.
  It is deliberately outside every section.
- A two-column grid that collapses to `flex-direction: column` must restate
  `align-items: stretch`. `align-items: start` is a grid instruction; on a flex column it
  sizes every child to its own max-content, which blew a 375px phone page out to 620px.
- The bottom edge of a section page is one sticky stack anchored by the save bar, clearing
  the phone tab bar by reading `--tabbar-h`. Never pin to the bottom with a hard-coded
  offset, and never measure the bar — its height changes as its message wraps.
- `html { scrollbar-gutter: stable }` in `globals.css`. Without it a page that scrolls and a
  page that does not disagree about the centre line by 7–8px, and it reads as different
  margins rather than as different scrollbars.
- The rail beside a form is separated by the gutter, not by a fill: a 380px column, a 40px
  gap, a hairline down the middle of it.
- Blush (`--surface-warm`) means **speech** — the assistant panel, the receptionist's line
  in a call preview. Never a callout or a badge inside a form.
- The `vietnamese` subset on all three fonts in `src/app/layout.tsx`. Drop it and accented
  glyphs fall back mid-word for the only audience this product has.
- `<html lang="vi">`. A screen reader pronounces the whole app as English without it.

Three more that Next.js adds:

- **Everything under `/app` is client-rendered, and that is correct** — it is a cookie-gated
  application with optimistic edits and nothing for a crawler to read. The marketing and
  auth route groups stay server components, which is where the SEO lives. This split is what
  the route groups are for, and it is why the root layout carries no chrome.
- **A module that touches `localStorage` at import time breaks `next build`.** The safe
  wrapper in `src/api/mock-support.ts` guards at call time *and* on `typeof window`; keep
  both, and keep such modules reachable only from a `'use client'` component.
- **A layout decision read from `window.innerWidth` during render is a hydration mismatch.**
  Render both layouts and let the CSS media query choose; use JavaScript only for state a
  media query cannot express, such as whether a sheet is open. The app shell's three shapes
  are the `rail` and `wide` breakpoints declared in `globals.css`, not measurements.
- **Anything a client component imports ships to the browser with it.** A fixed-copy block
  beside a form — the sign-in panel — is built in the server page and handed down as a
  prop, so it stays a server component. `panel={<SignInPanel />}` is the pattern.
- **A value read from `localStorage` during render needs `useSyncExternalStore`, not an
  effect.** `src/session/session.ts` publishes the session hint that way: a server snapshot
  of `false`, a real read after hydration, and no second render to correct the first.

## Doc map

| Doc | Holds |
|---|---|
| `PLAN.md` | Roadmap, what Fonnus-BE is blocking, and the backlog — the single live tracker, updated in the finishing commit |
| `CONTEXT.md` | Product, users, the legal constraints, stack, deployment posture |
| `docs/adr/` | The four decisions with rationale and revisit triggers: the stack, the design system by copy, the backend boundary, the source layout |
| `docs/architecture.md` | The `src/` tree as it is and as the roadmap completes it, the import direction, the rules per directory, and where a new file goes. Living document |
| `docs/api-contract.md` | The HTTP contract Fonnus-BE implements. This repo is its authority |
| `docs/open-questions.md` | The questions Fonnus-BE has to answer, with recommendations; answers are written in place |
| `docs/field-catalogue-mapping.md` | How the configuration model relates to the pipeline's field catalogue, and what `[ext]` means |
| `docs/context-field-catalogue.v1.md` | The frozen copy of `../Fonnus/docs/context-field-catalogue.md`, so the mapping is checkable without that checkout |
| `docs/ui-ux-principles.md` | Nine rules distilled from real mistakes. Living document — read before, extend after |
| `docs/visual-language.md` | Colour, icons, shapes, patterns, and the `--icon-accent` rule |
| `README.md` | How to run it, including with no backend at all |
| `.claude/agents/`, `.claude/skills/` | The pm persona, its executors and the requirement skill — the working method, versioned with the repo |
| `.claude/rules/` | Coding rules loaded by path: `next-code.md` (React and Next.js), `tailwind-classes.md` (which theme names to use), `test-code.md` (what a test may touch) |

## Commands

`pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test`.

`pnpm typecheck` is the gate that matters most: it is what catches a live API implementation
drifting from the mock it replaces.

## Before you finish

- `pnpm typecheck`, `pnpm lint` and `pnpm test` clean.
- The demo login still works: phone `0914378064`, code `111002`. This is the acceptance test
  for anything touching auth, routing or the session.
- No English string reaches the screen. `NEXT_PUBLIC_MOCK_FAILURE_RATE=1` is how the error
  paths are walked without a backend.
- If you changed an interface in `src/api/contracts.ts`, `docs/api-contract.md` changed in
  the same commit.

## Commit messages

English. One summary line, a complete clause naming the change, blank line, then bullets —
one complete sentence each — for the why, a decision, or a behaviour change the summary
cannot carry. Not a file inventory; short comes from fewer points, never from clipped words.
Rationale lives in the ADRs.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
