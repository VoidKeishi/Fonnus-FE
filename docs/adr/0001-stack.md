# ADR 0001: Next.js 16 App Router, Tailwind v4, and the same toolchain as the other Fonnus repos

**Status:** accepted · **Date:** 2026-09-15

## Decision

Fonnus-FE is a Next.js 16 application on the App Router, React 19, TypeScript 5.9 under the
strict flag set the pipeline uses, Tailwind CSS v4 for styling, Vitest for tests, pnpm 11 on
Node 22. Every version and every configuration file is taken from `../Fonnus-Admin`, which
made these choices first, so that a session that knows one repo knows both.

Specifics that are decisions rather than defaults:

1. **The App Router, and real URLs.** Routes are file-system segments with Vietnamese paths
   (`/dang-nhap`, `/app/le-tan/ho-so`). The prototype `../Fonnus-Web-UI` routes on fragments
   (`#/app/le-tan/...`); that is dropped. Its own reason for hashes was that a static
   `dist/` had to drop onto any host without a single-page-app fallback rule — Next.js *is*
   the server, so the constraint is gone. Three things follow: the landing page is
   server-rendered and therefore indexable, which is its entire job; the Google OAuth
   redirect URI becomes an ordinary path and `docs/open-questions.md` Q18 is closed by
   deletion; and `next/link`, scroll restoration and per-segment `loading`/`error` files
   become available.
2. **TypeScript's strict eight.** `strict`, `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
   `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` — the same set as
   `../Fonnus`. `exactOptionalPropertyTypes` is the one that costs something: the prototype
   does not set it, so ported code needs `signal?: AbortSignal | undefined` where it wrote
   `signal?: AbortSignal`. That is the flag doing its job and it is not weakened.
3. **ESLint pinned to 9.x**, not the pipeline's 10.x, because `eslint-config-next` pulls
   `eslint-plugin-react`, which crashes on ESLint 10. The three rules ESLint 10 added to
   `recommended` are switched on by hand so the rule set stays equal to the pipeline's.
   Raise the pin when that plugin supports ESLint 10.
4. **Three runtime dependencies: `next`, `react`, `react-dom`.** The HTTP client, the error
   type, the mock layer and the icons are hand-written and each is under about 200 lines.
   `pg` and `@aws-sdk/*` are deliberately absent — this repo touches no database and no
   bucket (ADR 0003) — and so is `recharts`, which Fonnus-Admin needs and no screen in this
   product's design has a use for.
5. **Vitest over pure functions only.** No jsdom and no component tests in the scaffold;
   adding a DOM runner is a decision with its own roadmap row, not a default.

## Why

- Two of the three surfaces — the landing page and sign-up — are acquisition surfaces for
  clinics that will find Fonnus by searching. A client-rendered SPA behind a `#` cannot be
  indexed, and that alone rules out keeping the prototype's Vite setup.
- Fonnus-Admin already solved every toolchain question for a Next.js repo that has to wear
  this design system. Re-deciding them differently would buy nothing and cost every future
  session the difference between the two.
- The strict flags are the cheapest defect gate this repo has. `pnpm typecheck` is also the
  mechanism that catches a live API implementation drifting from the mock it replaces
  (ADR 0003), so it is load-bearing rather than hygienic.

## Rejected

- **Keep the Vite SPA and harden it.** No server rendering for the landing page, the OAuth
  fragment trap stays, and the hash router remains hand-maintained. Cheapest today, wrong
  for a page whose purpose is to be found.
- **SvelteKit or Remix.** Both are reasonable; neither is what the sibling repo runs, and
  the value of the sibling repo is that it is the same.
- **CSS Modules only, no Tailwind.** This is the prototype's convention and it is a good
  one, but Fonnus-Admin ADR 0003 already took the other fork for a repo wearing these same
  tokens, and a screen lifted between the two repos should not need translating. See
  ADR 0002 for how the tokens survive the change.
- **The Pages Router.** Route groups are what keep the marketing surface server-rendered
  while the signed-in app is a client application; the Pages Router has no equivalent.

## Revisit when

- `eslint-plugin-react` supports ESLint 10 — raise the pin and delete the three hand-enabled
  rules.
- A screen needs a chart, or a component test that a pure function cannot express — add the
  dependency then, with a roadmap row.
- A static export is ever needed for a host that cannot serve a fallback — that is the only
  condition under which point 1 was wrong.
