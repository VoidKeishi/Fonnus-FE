---
paths:
  - 'src/**/*.{ts,tsx}'
---

# Next.js and React code in this repo

CLAUDE.md §Things that are load-bearing already covers hydration, localStorage and
the server-built panel. This file adds the rest. Hook rules apply only to files
marked `'use client'`.

## Advice that does not apply here

| Advice | Why not |
|---|---|
| Use SWR / TanStack Query for dedup and caching | Three runtime dependencies (ADR 0001). Data goes through `api` from `@/api` |
| `React.cache`, parallel fetching in server components, server actions | No server-side fetching and no BFF (ADR 0003) |
| Skip `useMemo`/`useCallback`, the compiler handles it | React Compiler is not enabled in `next.config.ts` |
| `React.lazy` for a heavy component | Use `next/dynamic`. Routes are already split by segment |

## Server and client boundary

- Put `'use client'` as low as the state needs. A layout or page stays a server
  component and renders client leaves, as `src/app/app/layout.tsx` does.
- `next/dynamic` with `{ ssr: false }` only works inside a client component; a
  server component rejects it.
- A client component that calls `useSearchParams` on a prerendered route sits
  inside `<Suspense>`, or `next build` fails. `next dev` does not show this.

## Data through `src/api`

- An effect that calls `api.*` passes an `AbortController` signal and aborts in
  cleanup. StrictMode runs the effect twice in development, and a stale answer
  must not overwrite a fresh one. Ignore the abort with `isCanceled(err)`.
- Independent calls run together with `Promise.all`, not one `await` after
  another.
- Do not `await` before a branch that may not need the result. Check the cheap
  condition first.
- Every screen that loads data draws three states: loading, error with retry
  (copy from `messageFor`), and empty. Walk the error path with
  `NEXT_PUBLIC_MOCK_FAILURE_RATE=1`.
- Never render `err.message` or any text from the server. Only Vietnamese from
  `src/api/errors.ts`.

## State and re-renders

- A value that can be computed from props or state is computed during render,
  not copied into state by an effect.
- A state update that depends on the previous value uses the updater form
  `set(prev => …)`. A deferred delete that closed over the old array once
  restored a row already deleted (`docs/ui-ux-principles.md`, Lessons log
  2026-09-05).
- `useState(() => expensive())` when the initial value has to be computed.
- A context provider memoizes its `value` with `useMemo`, and the functions
  inside it with `useCallback`. A new object on each render re-renders every
  consumer.
- `useEffectEvent` for a callback an effect calls but must not depend on. Do
  not use it only to silence `exhaustive-deps`.
- `startTransition` for frequent updates that can wait: typing in a filter,
  dragging a row.

## Rendering

- A ternary instead of `&&` when the condition is a number: `{count && …}`
  renders `0`.
- `<Activity mode={open ? 'visible' : 'hidden'}>` for a panel that opens and
  closes often and must keep its state, such as the try-out rail on a phone.
- One global listener shared by N components lives in one hook, not in each
  component. Add it in an effect and remove it in cleanup.
- A list key is a stable id from the data, never the array index. Rows in this
  app are added, removed and reordered.

## JavaScript

- `toSorted`, `toSpliced`, `with` instead of `sort`, `splice`, and index
  assignment. `sort` changes the array a prop points to.
- Repeated lookups inside a loop: build a `Map` or `Set` first.
- Return early instead of nesting conditions.
