---
name: requirement
description: Requirement + problem-framing interview for Fonnus-FE — challenge the need, then land either a screen brief or a posture problem brief BEFORE any design or code. Run from the pm persona at the start of any L task, or when the user says "spec this" / "new screen" / "màn mới".
---

# Requirement — the front of every L task

A repeatable interview that lands the non-technical truth of a task before anything
technical. Two shapes; pick by what the work changes. NO solution detail here — that is
the pm's design step, after ⏸①.

## Existing docs — import, don't re-derive

`CONTEXT.md` already settles who the user is (one clinic owner, alone, hurried, often on a
phone), what the app shows (§What the app shows), the legal lines every screen (§Legal, and visible on screen)
carries (the AI disclosure, consent rendered never decided), and the look. The prototype
`../Fonnus-Web-UI` settles what every screen it has looks like and does — for those
screens, requirement is a port decision (M), not an interview. `docs/api-contract.md`
settles what the backend provides; `PLAN.md` §Waiting on `../Fonnus-BE` settles what it
does not yet. Read the relevant section, restate what it settles, and interview only the
genuinely open points.

## Shape A — screen-shaped (a screen, a view, a flow the prototype does not have, or a
change to one it settled)

1. **Challenge the need.** What does the clinic owner do on this screen that they cannot do
   today — configure something, read what Linh did, fix a mistake? How often, from which
   device? What happens if we build nothing — do they phone us, edit a field elsewhere, or
   simply not know? "Don't build it" is a valid verdict, recorded so it isn't re-litigated.
2. **Where it sits and what it reads.** Which route, which nav entry, which contract group —
   declared already, "specified later" in `docs/api-contract.md`, or not provided at all
   (then the ask goes to `docs/open-questions.md` and `PLAN.md` §Waiting on `../Fonnus-BE`
   first, and this screen waits or ships mocked). For a configuration screen: which
   catalogue fields, and whether any is `[ext]`.
3. **What the user sees, state by state.** The happy path, the empty state and what it
   teaches, loading, each error the contract can return, the failed save, the phone width.
   The legal lines it carries. Copy in the receptionist's voice where the prototype has
   none to borrow. This table becomes the builder's section brief — an incomplete table
   forces a smaller first slice.
4. **Direction.** 2–3 GENUINELY different screen-level directions with trade-offs (one
   page vs a tab; entries in a card vs a table; a new primitive vs an existing one bent),
   recommend one, the user picks. Record chosen + rejected + why each lost.

Write it down as decisions land, never batched to the end: the screen brief lives in the
⏸① summary and, when the design lands, in the ⏸② section brief and `CONTEXT.md` if what the
product shows changed. New vocabulary that is this product's own → grill → it is named
before anything in code is; pipeline vocabulary and catalogue names are never renamed.

## Shape B — posture-shaped (deployment, auth or cookie posture, a dependency, a new seam)

1. **Challenge the need.** What is measurably wrong or blocked? Who cannot do what today?
2. **Constraint.** Which ADR (0001 stack, 0003 backend boundary), which `docs/api-contract.md`
   §1 line, or which `CONTEXT.md` legal line binds it; what must not widen (a fourth
   runtime dependency, a `fetch` outside the seam, a secret in the repo, a server that
   reads a database).
3. **Directions.** 2–3 genuinely different approaches at the level of mechanism, with
   trade-offs and a recommendation; the user picks the ones worth designing.

Output: a problem brief (problem · constraint · directions to pursue) — it lives in the ⏸①
summary and seeds the ADR draft the pm writes in the design step.

## Exit = ⏸①

Present the summary — settled / open / size estimate — and wait for the user's go-ahead
before writing any design or dispatching any builder.
