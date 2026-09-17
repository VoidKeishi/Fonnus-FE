# ADR 0004: Product surfaces under `src/features/`, shared code in five fixed directories, and the route tree kept empty

**Status:** accepted · **Date:** 2026-09-17

## Decision

`src/` has one shape, recorded as current state in `docs/architecture.md` and enforced by
the rules there. The parts that are decisions rather than defaults:

1. **`src/app/` holds only Next.js convention files.** A `page.tsx` imports one component
   from a feature directory and returns it. Components, hooks and constants never live in
   the route tree, and the thirteen Lễ tân sections are three `[section]/page.tsx` files
   reading one map, not thirteen directories.
2. **Every product surface is a directory under `src/features/`, one per tab or per door**:
   `receptionist`, `overview`, `calls`, `appointments`, `numbers`, `account`, `auth`,
   `marketing`. Directory names are English; route segments stay the prototype's Vietnamese
   (`/app/le-tan/...`). The receptionist configuration tab is `features/receptionist/`, not
   `letan/`.
3. **Shared code lives in five fixed directories** — `api/`, `session/`, `shell/`, `ui/`,
   `design-system/` — plus `data/` for copy and `styles/tokens/` for the byte-copied tokens.
   Features import them; they never import a feature.
4. **Import direction is `app → features → {shell, session} → {ui, design-system, api,
   data}`,** and two feature directories never import each other. The only channels between
   tabs are `session.patchMe()` and `markSummaryStale()` from `shell/summary.ts`.
5. **Files and directories are kebab-case, named for purpose, never for kind.** No `utils`,
   `helpers`, `types`, `hooks/`, `components/`; no `New`, `V2`, `Old`, `Copy`.
6. **The gate is one `no-restricted-imports` glob in `eslint.config.mjs`,** added when
   `features/` gets its second directory. Size ceilings and naming have no gate; the pm's
   review carries them.
7. **The record is split three ways.** This ADR holds the decision and what it beat;
   `docs/architecture.md` holds the current tree and the rules per directory;
   `.claude/rules/` holds coding rules that load by file path. A change to the layout
   updates `architecture.md`; a change to the reasoning reopens this ADR.

## Why

- The prototype organised its screens by tab, and the team talks about the product by tab.
  A tree with the same axis is one a new session can navigate from the sidebar labels.
- Point 4 is only enforceable if every feature has one parent: `features/X/` not importing
  `@/features/Y` is one lint glob. Spread across top-level directories (`src/auth/`,
  `src/letan/`, …) the same rule needs a list that is edited every time a tab is added.
- The route tree stays empty because the prototype's hash routes were hand-maintained and
  the App Router's file conventions are the replacement: they must stay readable as a route
  map. `app-shell.tsx` and `nav.ts` sitting under `src/app/app/` already made the route
  directory read as a component directory.
- `letan` was the prototype's single Vietnamese identifier in code. Everything written down
  in this repo is English (`CLAUDE.md` §Ground rules); the Vietnamese layer is the screen
  and the URL.
- kebab-case is what `../Fonnus-Admin` does, and this repo mirrors that repo's toolchain so
  a session that knows one knows both. The tree held three conventions at once
  (`Button.tsx`, `useCountdown.ts`, `auth-shell.tsx`).

## Rejected

- **A flat `src/` with one directory per screen at the top level** (`src/auth/`,
  `src/letan/`, `src/calls/` — where the tree was heading). Fewer levels, but no parent for
  the import rule to attach to, and no line between "a product surface" and "shared code"
  that a newcomer can see in `ls src`.
- **`src/letan/` as the prototype named it.** Byte-faithful to the prototype, and the only
  Vietnamese identifier the code would hold. Route segments already carry the Vietnamese
  name the owner sees; a directory does not need to.
- **Grouping by kind** (`components/`, `hooks/`, `utils/`). Familiar, and it is where every
  file lands and nothing is found again; it also makes the feature-isolation rule
  inexpressible, because a hook for one tab and a hook for another sit in the same
  directory.
- **Colocating each screen's code beside its route under `src/app/`** (Next.js's private
  `_folder` convention). It keeps a screen next to its URL, at the cost of the route tree
  reading as a code tree; and the thirteen sections rendered by three dynamic segments have
  no route directory to sit in, so the largest feature would not fit the convention anyway.
- **`.claude/rules/` as the only place the layout is written.** Path-scoped rules load only
  when a matching file is being edited; a session deciding where a *new* file goes has not
  opened one yet. Rules say how; they do not hold rejected alternatives. The rules stay for
  the how, this ADR for the why, `architecture.md` for the map.
- **dependency-cruiser as the import gate.** A real tool for a rule with five lines. It is a
  dependency, and one ESLint glob covers the rule this repo actually has.

## Revisit when

- A third channel between two tabs is genuinely needed. Either something is in the wrong
  directory, or the product has grown a shared model and point 4 needs a real answer.
- `contracts.ts` passes 600 lines — it becomes `contracts/<group>.ts` with `contracts/index.ts`
  holding `API_GROUPS`, as `architecture.md` §2.3 already says.
- A second kind of user (a staff role, a second product) appears. `features/` is one axis
  — the tab — and a second axis would need a second level.
- The `no-restricted-imports` glob collects `eslint-disable` lines. That is the signal the
  rule is wrong or the tool is, and the moment dependency-cruiser is worth its cost.
