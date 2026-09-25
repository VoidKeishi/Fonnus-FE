# Source layout

Where a file goes in `src/`, and the rules that keep new code landing in the right place.
Written for someone who has not read the repo. The decision and the alternatives it beat are
in `docs/adr/0004-source-layout.md`; this document is the current state and is updated
whenever a directory is added, moved or given a new rule. `PLAN.md` tracks the gap between
today's tree and the target.

Three ideas decide everything below:

1. **`src/app/` is only the route tree.** A `page.tsx` imports one component from a feature
   directory and returns it. No logic lives in the route tree.
2. **Every product surface lives in `src/features/`, one directory per tab or per door**
   (`receptionist/`, `calls/`, `account/`, `auth/`, `marketing/`) — the way the prototype
   organised its screens and the way the team names the tabs. Code is never grouped by kind
   (`hooks/`, `utils/`). Directory names are English; route segments are Vietnamese.
3. **Everything shared lives in five fixed directories**: `api/`, `session/`, `shell/`,
   `ui/`, `design-system/`. Features import them; they never import a feature.

Not reopened here, because ADRs 0001–0003 settled them: route groups that keep marketing
server-rendered and `/app` client-rendered; the `src/api/` mock/live seam per group; the
httpOnly cookie with no middleware while mock is the default; `env.ts` as the one reader of
`process.env`; `snake_case` fields from the catalogue; three runtime dependencies.

## 1. The tree

Everything that exists today is listed; a line marked with a roadmap step (`F3`, `F4`, …)
arrives with that step in `PLAN.md` and is here so the destination is known before the code
is written. File names are kebab-case (§2.2).

```
src/
  app/                          Route tree. Only Next.js convention files
    layout.tsx                  <html lang="vi">, the three fonts, globals.css, SessionProvider (+ ToastProvider, F2). No chrome
    globals.css                 Tailwind, the token imports, the @theme alias layer
    icon.svg · not-found.tsx
    global-error.tsx            'use client', plain HTML, Vietnamese: runs when the root layout itself failed  [backlog]
    api/healthz/route.ts        Liveness of this server. Build SHA added at F7
    (marketing)/                F4. layout (header, footer, the call demo's provider), page, cham-diem-hotline/, error.tsx
    (auth)/                     layout (AuthShell, F1b), dang-nhap/, dang-ky/ (F1b), error.tsx [backlog]
    app/                        layout: RequireSession → AppShell (→ ConfigProvider, F3). error.tsx [backlog]
      page.tsx                  Tổng quan
      cuoc-goi/ · cuoc-goi/[id]/ (F5) · lich-hen/ · so-dien-thoai/ · cai-dat/ (F6) · goi-dich-vu/ (F6)
      le-tan/                   Hub (F3), then ho-so/ · kien-thuc/ · ky-nang/, each with a [section]/page.tsx

  api/                          The one door to the network (ADR 0003)
    contracts.ts                Types only: one interface per group, API_GROUPS
    index.ts                    The only file that chooses mock or live
    env.ts                      The only file that reads process.env (lint-enforced)
    http.ts                     The fetch wrapper; only *.live.ts imports it
    errors.ts                   ApiError and every Vietnamese error sentence
    mock-support.ts             delay, maybeFail, storage, the demo fixtures
    phone.ts (+test)            Vietnamese phone rules and the national digits-only wire form; used by auth and marketing
    sign-up-handoff.ts (+test)  The number typed in the landing hero, carried to /dang-ky in sessionStorage
    auth.mock.ts · auth.live.ts
    tenant.* (F3) · receptionist.* · voice.* (F3 try-out) · leads.* (F4) · shell.* · insights.* (Tổng quan) · calls.* (F5) · appointments.* · numbers.* · account.* (F6)

  session/                      Who is signed in
    session.ts                  The localStorage hint, through useSyncExternalStore
    session-provider.tsx        status · me · error · signIn · patchMe · signOut · recheck
    require-session.tsx         The gate on /app: skeleton, connection error, redirect

  shell/                        What every signed-in page shares
    app-shell.tsx               Sidebar, icon rail, bottom tab bar
    nav.ts                      NAV, TAB_NAV, MORE_NAV, activeHref
    shell-skeleton.tsx (F2) · toast.tsx (F2) · summary.ts (Tổng quan) · bottom-stack.tsx (F3)

  features/                     Every product surface. One directory per tab or door
    auth/                       auth-shell, sign-in-page, sign-in-panel, sign-up-page (F1b), field, otp-field, use-countdown, last-method
    receptionist/               F3. The Lễ tân tab — see §3
    overview/ · calls/ · appointments/ · numbers/ · account/   One per tab; F5, F6
    marketing/                  landing.tsx (the section list, then the orb) · header.tsx · nav-item-link.tsx · footer.tsx
                                hero/ (hero, sign-up-form, clinic-logos)
                                orb/ (voice-orb, orb, orb-field, use-orb-placement, orb-motion, call-overlay,
                                call-demo-provider, use-call-demo, greeting-player, call-state)
                                sections/ (section-chrome, missed-calls, how-it-works, how-it-works-visuals,
                                play-when-seen, pricing, plan-card, comparison-matrix, billing-period,
                                billing-switch, plan-price, matrix-disclosure; later sections join them)
                                use-reveal.ts · scroll-reveal.tsx (arms the reveal once, from the landing page)
                                F4 adds: hotline/

  design-system/                Brand primitives every surface uses
    button.tsx (+ buttonClassName, the classes a Link wears) · input.tsx · icon.tsx · logo.tsx · icons.ts · index.ts
    pattern.tsx · switch.tsx · shape.tsx (only the drawings in use) · badge.tsx (arrives with its first consumer)

  ui/                           The signed-in app's kit. Marketing never imports it
    placeholder.tsx             A screen not built yet. Deleting the last one closes the roadmap
    card · empty-state · add-button · delete-button · suggestions · field · money · pickers · use-anchored-popup ·
    choice · chips · tiles · rows · save-bar · tabs · disclosure · slider · icon-button · play-button ·
    token-area · charts · table · use-appear · use-element-width · speak · index.ts   each with its first consumer

  data/                         Copy with no markup: auth.ts, content.ts, call-demo.ts (the call screen's chips and voices), pricing.ts, then call-demos.ts (F4)
  styles/tokens/                Byte copies from ../Fonnus-Web-UI (ADR 0002)
```

## 2. Rules for all of `src/`

### 2.1 Import direction

```
app  →  features/*  →  { shell, session }  →  { ui, design-system, api, data }
```

| Rule | Why |
|---|---|
| Two directories under `features/` never import each other. | The only two channels between tabs are `session.patchMe()` (a page changes what the sidebar shows: the name, the plan) and `markSummaryStale()` from `shell/summary.ts` (a page makes the sidebar's numbers stale). The prototype ran the whole product on exactly those two. Needing a third means something is in the wrong directory. Keeping every feature under one parent is what lets this rule be one `no-restricted-imports` glob. |
| `ui/` and `design-system/` never import a feature, `api/`, `session/` or `shell/`. | A control receives its data through props. A control that knows about the API cannot be reused and cannot be tested as a pure function. |
| `features/marketing/` never imports `ui/`, `session/` or `shell/`. | The landing page is a server component so a crawler can read it. `ui/` is the client kit; pulling it in drags `'use client'` into the acquisition surface. Marketing uses `design-system/`, `data/`, and `api.leads` in the contact form. |
| `api/` imports nothing outside itself and no React. | `http.ts` exposes its 401 hook through a module-level setter instead of importing `session/`. The other direction is the cycle `session → api → session`. |
| `session/` and `shell/` import `api/`, `ui/`, `design-system/`; never a feature. | The sidebar shows numbers from `api.shell`, not the state of one tab. |

### 2.2 Naming

- **Files and directories are kebab-case**, components and hooks included: `save-bar.tsx`,
  `use-draft.ts`. This is `../Fonnus-Admin`'s convention (`empty-state.tsx`, `row-click.ts`),
  the repo whose toolchain this one mirrors.
- **A name says what the code is for, never what kind of code it is.** No `utils.ts`,
  `helpers.ts`, `types.ts`, `constants.ts`; no `hooks/` or `components/` directory. A type
  sits beside the code that uses it; a hook sits in the feature that uses it, or in `ui/`
  when two features do.
- **`New`, `V2`, `Old`, `Copy` are banned in names.** Replace a thing in place and delete
  the old one in the same commit. History is in git.
- A component is exported in PascalCase, one main component per file. A file may hold
  unexported helper components.
- Route segments are unaccented Vietnamese, as in the prototype:
  `/app/le-tan/kien-thuc/gio-mo-cua`. A key in a section map equals its segment.
- Feature directories are English (`receptionist/`, `calls/`, `appointments/`); route
  segments are Vietnamese (`le-tan`, `cuoc-goi`, `lich-hen`). Two layers, two languages —
  the "code English, screen Vietnamese" rule applied to paths. The prototype's `letan/` was
  its only Vietnamese identifier and is not ported.

### 2.3 Size

No gate enforces these; the pm's review does.

| Unit | Ceiling | When exceeded |
|---|---|---|
| A `.ts` file | 300 lines | Split, or explain why in a comment at the top |
| A `.tsx` file | 400 lines | Same |
| A function | 60 lines | Split |
| `contracts.ts` | 600 lines | Becomes `contracts/<group>.ts` with `contracts/index.ts` holding `API_GROUPS`. The prototype's is 1102 lines |
| `eslint-disable` across the repo | 10 lines | `grep -rn eslint-disable src` counts |

### 2.4 Server and client

- `'use client'` goes on the lowest file that needs state or a hook, never on a layout or a
  page. `src/app/app/layout.tsx` is the model: a server component rendering client leaves.
- **The `(marketing)` route group makes no request to Fonnus-BE on load and reads no
  session.** Its header always offers "Đăng nhập" and "Dùng thử miễn phí", as the prototype
  does; sending an owner who is still signed in straight on to `/app` is the sign-in page's
  job, not the landing page's (`PLAN.md` §Backlog).
- `SessionProvider` is mounted in the root layout so state survives the move from
  `/dang-nhap` to `/app`, but its probe runs only when `usePathname()` is under `/app`,
  `/dang-nhap` or `/dang-ky`. This differs from the prototype, which probed on the landing
  page too because everything there was client-rendered. (Today the probe still runs
  everywhere; the conditional probe is a `PLAN.md` §Backlog item, waiting on Fonnus-BE.)
- `ToastProvider` is in the root layout too: a "session expired" toast has to survive the
  redirect from `/app` to `/dang-nhap`, and those two routes share no other layout.
- `ConfigProvider` is mounted in `app/app/layout.tsx`, not the root. An App Router layout
  persists across navigation between its children, so the tenant record loads once for all
  of `/app`. Tổng quan and Cuộc gọi read readiness from it, as in the prototype.
- A module that touches `localStorage` or `window` does so only inside a function call, with
  a `typeof window` guard, and is imported only from client files. A value read during
  render goes through `useSyncExternalStore` (`CLAUDE.md` §Things that are load-bearing).

## 3. Rules per directory

### `src/app/` — the route tree

- Only Next.js convention files: `layout`, `page`, `error`, `not-found`, `route`, `loading`.
  No components, no hooks, no constants.
- A `page.tsx` is 3–10 lines: import one component from a feature, return it. `metadata` is
  declared here because this is the server file.
- The thirteen Lễ tân sections are **three `[section]/page.tsx` files**, not thirteen
  directories. The page reads `params`, looks the segment up in the map exported by
  `features/receptionist/sections.ts`, and calls `notFound()` when it is absent. The map is
  the one place sections are listed; `/app` renders on the client and needs no SEO, so a
  dynamic segment costs nothing.
- Each route group has its own `error.tsx`, Vietnamese copy, a retry button.
  `global-error.tsx` at the root is plain HTML and imports nothing from `design-system/`:
  it runs when the root layout itself has failed.
- No `loading.tsx` under `/app`: a client page draws its own skeleton from its state, and
  `RequireSession` already draws the shell's.
- No `route.ts` other than `healthz`. No API-proxying route handler, no server action
  (ADR 0003 point 5).

### `src/api/` — the door to the network

- One group = one interface in `contracts.ts` + one `<group>.mock.ts` / `<group>.live.ts`
  pair + one line in `index.ts` + one entry in `API_GROUPS`. All four arrive in the commit of
  the first screen that calls the group, never before.
- `contracts.ts` holds only types and `API_GROUPS`. It imports no implementation. An
  interface change here changes `docs/api-contract.md` in the same commit.
- `*.live.ts` are the only files that import `http.ts`. `*.mock.ts` are the only files that
  import `mock-support.ts`. No file imports both.
- A mock writes localStorage through `storage` from `mock-support.ts`, never
  `window.localStorage` directly, and only inside a function call.
- Every function takes `signal?: AbortSignal | undefined` (spelled out because of
  `exactOptionalPropertyTypes`).
- Vietnamese error sentences live only in `errors.ts`, looked up by machine-readable `code`.
  `err.message` never reaches the screen.
- Fields are `snake_case` exactly as the catalogue names them; no camelCase mapping at any
  layer.
- A group that needs a WebSocket (`voice`) dials Fonnus-BE's origin directly through its own
  variable in `env.ts`; the Next.js rewrite does not upgrade WebSockets.

### `src/session/`

- Three states, not a boolean: `checking | authenticated | anonymous`. "Not known yet" is a
  real answer.
- `session.ts` is a hint, not a credential: it only picks a placeholder. Nothing is gated on
  it.
- `require-session.tsx` is the only gate on `/app`. No middleware while mock is the default.
- `patchMe()` is how a page changes the name, number or plan the sidebar shows. The provider
  does not grow because one page needs one more field.

### `src/shell/`

- What every signed-in page shares: the frame, the nav, toasts, the sidebar numbers, the
  save stack.
- `nav.ts` is the one list of destinations; the sidebar, the icon rail and the tab bar all
  read it, so they cannot drift. (The prototype keeps Cài đặt outside `NAV`, after the user
  block; this repo has it inside. That is a product question in `PLAN.md` §Decisions the
  user still owes, not an architecture rule.)
- `summary.ts` is not a provider: a hook that re-reads on tab change, when the browser tab
  becomes visible again, and on the `fonnus:summary-stale` event. A failed read keeps the
  old numbers on screen.
- `bottom-stack.tsx` is the one sticky stack at the bottom edge, anchored by the save bar,
  reading `--tabbar-h`. Never measure the bar, never a hard-coded offset.

### `src/features/receptionist/`

- `model.ts` is a 1:1 copy of the catalogue; every field records its origin (TE/SW/SD) and
  gate (R1/R2/O). A field outside the catalogue is marked `[ext]` and gets its row in
  `docs/field-catalogue-mapping.md` in the same commit.
- `readiness.ts`, `answers.ts`, `greeting.ts`, `instructions.ts`, `questions.ts` are pure
  functions, no React, with a test beside each. This is the only product logic complex
  enough to need tests and the only kind the current Vitest setup runs.
- `config-store.tsx` holds **one record**, never null (`defaults.ts` fills it before load),
  and saves **one PATCH per section**, optimistically, rolling back per key only when the key
  still holds the value it wrote. After a save it adopts the whole record the server returns.
  This is the shape the prototype ran and it does not change.
- `use-draft.ts` holds dirty tracking and returns the props for `SaveBar`. After a save the
  draft re-adopts its keys from the saved record so server-assigned row ids reach the form;
  without that step the next save duplicates every service row.
- One section = one file in `profile/`, `knowledge/` or `skills/`, using the shared
  `section-frame.tsx`. No section redraws the frame.
- The readiness meter value (which the prototype kept in a module-level `Map` because hash
  routing never unmounted) moves into the store, because the App Router unmounts a page on
  route change.

### `src/features/{overview, calls, appointments, numbers, account}/`

- One directory per tab. The main file is `<tab>-page.tsx`; the route's page returns it.
  There is no shared `features/index.ts`: a route imports `@/features/calls/calls-page`
  directly.
- Each tab calls `api.<group>` itself with local `busy`/`error` state. No provider, because
  no other tab needs the result — the prototype's rule: "does more than one component need
  to see the result? If no, call it directly."
- To change what the sidebar shows → `patchMe`. To make the sidebar numbers stale →
  `markSummaryStale()`. No other way.
- Every screen has three states: loading, error with retry, an empty state that teaches
  (`docs/ui-ux-principles.md` §4). Walk them with `NEXT_PUBLIC_MOCK_FAILURE_RATE=1`.

### `src/features/auth/`

- The form is a client component; the copy panel is a server component handed down as a
  prop (`panel={<SignInPanel />}`).
- The phone rules this screen validates with live in `api/phone.ts`, because the landing
  hero needs the same rules and features never import each other. Nothing here calls any
  group but `api.auth`.
- After sign-in: `session.signIn(me)` then `router.replace('/app')`, never `push`, so Back
  does not return to the form.

### `src/features/marketing/`

- Server components by default. `'use client'` on the lowest file that holds state: the
  header (its menus, drawer and scroll state), the orb and its call demo, the two forms, the
  hotline page's chart, the scroll reveal, the billing switch and the prices it changes, and
  the comparison table's disclosure, and `play-when-seen.tsx`, which plays a
  "Cách hoạt động" scene once. The layout, the footer and the section copy stay on the
  server: a client leaf that wraps server content takes it as `children`, as the plan cards
  and the comparison table do.
- The scroll reveal is armed once, by `scroll-reveal.tsx` on the landing page. Blocks
  already on screen when it arms are marked revealed instead of hidden, because the server's
  HTML is painted before any hook runs. The stagger is CSS keyed by the `data-reveal` value.
- Copy the prototype kept in `data/` — the navigation, the FAQ, the testimonials, the
  contact details, the plans, the scripted calls — lives in `src/data/`; a section's own
  sentences stay in its component. A nav or footer link lands in the same change as the
  section it points at, and `src/data/content.test.ts` fails on a link to a section that
  does not exist.
- The voice orb is mounted once on the landing page, after every section, so leaving `/`
  unmounts it and closes any open call. It is never on `/cham-diem-hotline`, whose header
  sends "Nghe thử Linh" back to `/#hero` instead. The call's state lives one level up, in
  `CallDemoProvider` in the marketing layout, because the header opens the same call as the
  orb. The call demo runs entirely in the browser — the recorded greeting and a script, no
  `voice` group — until Fonnus-BE has a per-IP budget and a kill switch
  (`docs/open-questions.md` Q21).
- A night surface (the footer) renders inside a `data-theme="dark"` scope, so every alias
  inside it resolves to the night palette `colors.css` already defines. This is a night
  island in a light page, not a dark mode: nothing switches it.

### `src/design-system/`

- Only brand primitives that the landing page, auth and the app all use: button, input,
  badge, switch, icon, logo, shape, pattern. No application state, no Vietnamese copy.
- Icons are drawn in `icons.ts`, one accent through `--icon-accent`. No icon library, no
  emoji in markup.
- Imported through `@/design-system`, one door.
- Hover, press and focus are CSS variants, not state, so a primitive renders on the server.

### `src/ui/`

- The signed-in app's kit, ported from the prototype's `app/ui/`. A control moves here when
  **two** features need it; a control one feature uses stays in that feature.
- No native `<input type="date">` or `type="time"`: the system picker is blue and English.
  Use `pickers.tsx`.
- Anchored pop-ups use `use-anchored-popup.ts`; do not write another listener. The
  click-outside rule and the "scroll with `scrollTop`, not `scrollIntoView`" rule live
  there.
- A list has one shape: one `Card`, `AddButton` in the head, each record an entry in the
  card, `EmptyState` when empty, `Suggestions` in the same card. A dashed edge means
  content, not a button.
- Blush (`bg-surface-warm`) is for Linh's speech only. Never a callout, never a badge.
- Imported through `@/ui`, one door.

### `src/data/`

- Static copy and figures (plan prices, FAQ questions, demo scripts) as plain objects, no
  JSX. Every file here can be imported from a server component.

### `src/styles/tokens/`

- Byte copies. Never edited, only re-copied whole (ADR 0002). The token-copy test in
  `PLAN.md` §Backlog is the gate.
- `globals.css` is the only place Tailwind aliases are declared (`@theme inline`). An alias
  that is missing gets one line there before its class is used anywhere.

## 4. Where does X go

| To add | Put it in |
|---|---|
| A new screen | The feature directory of its tab, plus a 3–10 line `page.tsx` under `src/app/` |
| A new endpoint | An interface in `api/contracts.ts`, the `.mock.ts`/`.live.ts` pair, a line in `index.ts`, a section in `docs/api-contract.md`. Same commit as the screen that uses it |
| A Vietnamese error sentence | `api/errors.ts` |
| Screen copy | In the screen's component; landing copy in `data/` |
| An environment variable | One constant in `api/env.ts`, the name written out in full, plus a line in `.env.example` |
| A hook one feature uses | That feature's directory, named `use-<job>.ts` |
| A hook two features use | `ui/` if it is about the DOM or layout; `shell/` if it is about app state |
| A shared form control | `ui/` |
| A brand primitive (button, icon) | `design-system/` |
| A new configuration field | `features/receptionist/model.ts`; outside the catalogue, `[ext]` plus a row in `docs/field-catalogue-mapping.md` |
| A shared type | Beside the code that defines it; an API shape in `contracts.ts` |
| A constant | In the file that uses it. Two files → a file named for the job, e.g. `features/receptionist/sections.ts` |
| A test | `*.test.ts` beside the pure function it tests. Pure functions only (ADR 0001) |
| A new convention | Lint if lint can enforce it; otherwise `.claude/rules/`; a decision with a trade-off is an ADR |

## 5. What must not exist

- `src/components/`, `src/hooks/`, `src/utils/`, `src/lib/`, `src/types/`, `src/constants/`.
  A directory named for a kind of code is where everything lands and nothing is found.
- `fetch` outside `api/http.ts`. `process.env` outside `api/env.ts` (lint-enforced).
- `middleware.ts` while mock is the default (ADR 0003 point 9).
- An API-proxying route handler, a server action, `fetch` in a server component
  (ADR 0003 point 5).
- A hex colour in a component; a base-palette name (`--milk`, `--terracotta`) in a
  component, even inside `[var(...)]`.
- A global store (Redux, Zustand) or a data library (SWR, TanStack Query). Three runtime
  dependencies.
- An API group with no screen calling it. The prototype's `assistant` group and its
  knowledge-file upload are not ported.
- An English string reaching the screen, `err.message` included.
- A `.test.tsx` file: Vitest runs only `*.test.ts`, so it stays green by never running.

## 6. Gates, and what has none

| Rule | Gate |
|---|---|
| `process.env` only in `env.ts` | ESLint `no-restricted-properties`, in place |
| Mock and live share one interface | `pnpm typecheck`, in place |
| Import direction (§2.1) | ESLint `no-restricted-imports` in `eslint.config.mjs`, in place, by alias and by relative path: a feature never imports another (the list is read from `src/features/`); `features/marketing/` never imports `ui/`, `session/`, `shell/`; `ui/` and `design-system/` never import a feature, `api/`, `session/`, `shell/`; `session/` and `shell/` never import a feature; `api/` never reaches outside itself. No dependency-cruiser: that is a dependency |
| Tokens are byte copies | Not yet. Token-copy test, `PLAN.md` §Backlog |
| `api/index.ts` imports without `window` | Not yet. SSR test, `PLAN.md` §Backlog |
| Kebab-case, file size, purpose names | None. The pm's review |
| Tailwind aliases, no base palette | Not yet. `--color-*: initial` in `@theme` could switch the stock palette off; its effect on `bg-transparent` is unchecked |
| The demo login still works | By hand. A Playwright smoke test is a decision with its own `PLAN.md` row |
