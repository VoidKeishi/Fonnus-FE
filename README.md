# Fonnus-FE

The customer-facing frontend of Fonnus, the AI voice receptionist for Vietnamese clinics:
the landing page, sign-up and sign-in, and the app where a clinic owner configures their
receptionist and reads its call history.

Start with `CLAUDE.md` for the working rules, `CONTEXT.md` for what the product is, and
`PLAN.md` for what exists today.

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm test
```

Node 22.13 or newer, pnpm 11.

## Run it with no backend

Mock mode is the committed default, so `pnpm dev` works against an empty `../Fonnus-BE`:
every API call is faked in the browser with realistic latency. Sign in with

- **phone `0914378064`**, **code `111002`**

Any other six digits reaches the wrong-code state, which is how that screen stays
reviewable. This login is also the acceptance test for anything touching auth, routing or
the session.

To walk the loading, error and retry states, copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_MOCK_FAILURE_RATE=1`. There is no other way to reach them before a backend
exists.

## Point one group at Fonnus-BE

Groups go live one at a time, because Fonnus-BE will ship endpoints over weeks:

```bash
# .env.local
NEXT_PUBLIC_API_LIVE_GROUPS=auth
API_PROXY_TARGET=http://localhost:4000
```

The browser then asks `localhost:3000/api/v1/...` and Next.js forwards it, so no CORS is
involved in development. Everything else stays mocked. The contract those endpoints must
satisfy is `docs/api-contract.md`; the reasoning is `docs/adr/0003-backend-boundary-and-the-api-seam.md`.

## Layout

```
src/
  app/            The route tree only: Next.js convention files, each page returning one feature component
  features/       One directory per product surface: auth today; receptionist, marketing, calls, … as the roadmap lands them
  api/            The one door to the network: contracts, the mock/live switch, errors
  session/        Who is signed in, and the gate on /app
  shell/          What every signed-in page shares: the frame and the nav
  design-system/  Brand primitives: drawn icons, logo, button, input
  ui/             The signed-in app's kit, which marketing never imports
  data/           Copy with no markup around it
  styles/tokens/  The design tokens, copied verbatim from ../Fonnus-Web-UI
docs/             The API contract, the field catalogue mapping, the UI rules, the ADRs
public/           Logo assets and the greeting clip the landing page plays
```

The rules behind this tree — which directory imports which, how files are named, where a
new thing goes — are in `docs/architecture.md`; the reasoning is
`docs/adr/0004-source-layout.md`.
