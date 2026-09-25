---
paths:
  - 'src/**/*.test.ts'
  - 'src/**/*.test.tsx'
---

# Writing tests in this repo

- Pure functions only (ADR 0001 point 5). No jsdom, no component tests, no
  Next.js imports. A test that needs a DOM is a decision with its own
  `PLAN.md` row, not a new file.
- The file is `*.test.ts` and sits next to the file it tests.
  `vitest.config.mts` only includes `src/**/*.test.ts`, so a `.test.tsx` is
  never run and the suite stays green without it.
- Test names describe behaviour in the owner's terms: "turns +84 into the
  leading zero", not "normalizePhone case 2". A short comment at the top says
  why this logic deserves a test, as `src/api/phone.test.ts` does.
- Example data is Vietnamese and realistic: `0914378064`, `lan@vietsmile.vn`,
  a landline `02473077199`.
- Code under `src/api/` is tested through the mock implementation or a pure
  helper. No test makes a network request.
- The inner loop is `pnpm test:watch`; `pnpm test` is the gate.
