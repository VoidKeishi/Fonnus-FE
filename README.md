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

## Send the marketing forms to a Google Sheet

`POST /api/leads` appends one row per contact request to a Google Sheet, and
`POST /api/leads/hotline-report` one row per clinic location, through a Google service
account (`docs/adr/0005-leads-to-google-sheets.md`). With no setup both answer `503`.

1. In Google Cloud, create a project and enable the Google Sheets API.
2. Create a service account with no project role, then a JSON key for it. Keep the file
   outside this repository.
3. Create a spreadsheet with two tabs. `leads`, whose first row is `received_at`,
   `clinic_name`, `contact_name`, `phone`, `source`. `hotline_report`, whose first row is
   `received_at`, `request_id`, `contact_name`, `email`, `clinic_name`, `location_no`,
   `address`, `phone`; the rows of one request share a `request_id`.
4. Share the spreadsheet with the service account's `client_email` as an editor.
5. Put three variables in `.env.local`, or in the host's environment as secrets:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # client_email from the key file
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=""   # private_key from the key file, quoted, \n kept as written
LEADS_SPREADSHEET_ID=           # the part of the sheet's URL between /d/ and /edit
```

6. Turn the forms live: `NEXT_PUBLIC_API_LIVE_GROUPS=leads`. Both forms switch together.
   Without it they keep using the mock, which stores nothing.

On a public deployment the endpoints accept requests as soon as the three variables are set,
so put the rate limit on first. In the Vercel project: Firewall → a new rule, condition
"request path starts with `/api/leads`", action Rate Limit, fixed window, keyed on IP,
answering `429`. The forms already show "Bạn thao tác hơi nhanh…" for that answer. Mark the
private key as a Sensitive variable, and redeploy after changing any of the three: a
variable applies only to new deployments.

## Layout

```
src/
  app/            The route tree only: Next.js convention files, each page returning one feature component
  features/       One directory per product surface: auth today; receptionist, marketing, calls, … as the roadmap lands them
  api/            The one door to the network: contracts, the mock/live switch, errors
  server/         What runs only in a route handler: the marketing forms, written to a Google Sheet
  session/        Who is signed in, and the gate on /app
  shell/          What every signed-in page shares: the frame and the nav
  design-system/  Brand primitives: drawn icons, logo, button, input
  ui/             The signed-in app's kit, which marketing never imports
  data/           Copy with no markup around it
  styles/tokens/  The design tokens, copied verbatim from ../Fonnus-Web-UI
docs/             The API contract, the field catalogue mapping, the UI rules, the ADRs
public/           Logo assets, the greeting clip and the three sample-call recordings the landing page plays
```

The rules behind this tree — which directory imports which, how files are named, where a
new thing goes — are in `docs/architecture.md`; the reasoning is
`docs/adr/0004-source-layout.md`.
