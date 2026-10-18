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

`POST /api/leads` appends one row per contact request to a Google Sheet,
`POST /api/leads/hotline-report` one row per clinic location, and `POST /api/leads/waitlist`
one row per person joining the waitlist, through a Google service account
(`docs/adr/0005-leads-to-google-sheets.md`). With no setup all three answer `503`.

1. In Google Cloud, create a project and enable the Google Sheets API.
2. Create a service account with no project role, then a JSON key for it. Keep the file
   outside this repository.
3. Create a spreadsheet with three tabs. `leads`, whose first row is `received_at`,
   `clinic_name`, `contact_name`, `phone`, `source`. `hotline_report`, whose first row is
   `received_at`, `request_id`, `contact_name`, `email`, `clinic_name`, `location_no`,
   `address`, `phone`; the rows of one request share a `request_id`. `waitlist`, whose
   first row is `received_at`, `contact_name`, `phone`, `email`, `source`.
4. Share the spreadsheet with the service account's `client_email` as an editor.
5. Put three variables in `.env.local`, or in the host's environment as secrets:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # client_email from the key file
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=""   # private_key from the key file, quoted, \n kept as written
LEADS_SPREADSHEET_ID=           # the part of the sheet's URL between /d/ and /edit
```

6. Turn the forms live: `NEXT_PUBLIC_API_LIVE_GROUPS=leads`. All three forms switch together.
   Without it they keep using the mock, which stores nothing.

On a public deployment the endpoints accept requests as soon as the three variables are set,
so consider a rate limit first. The Hobby plan allows one Vercel Firewall rate-limit rule
per project, over `/api/leads*` (and the voice demo's token route, if wanted), keyed on IP,
a window of ten minutes or less; `PLAN.md` §Backlog carries it, and the forms already show
"Bạn thao tác hơi nhanh…" for the `429` it answers. Mark the private key as a Sensitive variable,
and redeploy after changing any of the three: a variable applies only to new deployments.

## Turn on the live voice demo

The voice orb on the landing page holds a real conversation with a voice agent hosted on
ElevenLabs Conversational AI (`docs/adr/0006-elevenlabs-landing-voice-demo.md`, amended by
`docs/adr/0007-voice-demo-agent-only-and-text-fallback.md` and
`docs/adr/0008-voice-demo-three-minutes-an-hour.md` and
`docs/adr/0009-voice-demo-budget-on-the-server.md`). A visitor gets three minutes of
conversation per hour, spent over as many calls as they like. The server keeps the count in
a signed cookie: minting a ticket charges the whole of what is left, and the real length of
each call is refunded from ElevenLabs's conversation list, so a spent hour is refused with a
`429` whatever the browser says and clearing site data gives nothing back. Every ticket is
minted behind an invisible Cloudflare Turnstile check, so a script without a browser pays
for each fresh hour with a solved challenge. There is no
recording and no mock: the visitor's browser talks to ElevenLabs directly, but only with a short-lived ticket,
which this app's `POST /api/voice-demo/token` obtains from ElevenLabs with a secret API key.
With no setup that route answers `503` and the call screen says it could not connect, which
is also what `pnpm dev` shows on a machine without the variables below. A visitor whose
browser gives no microphone talks to the same agent by typing, and reads the replies.

1. In the ElevenLabs dashboard, open the agent and set it up as follows.
   - Under Advanced → Call limits, set `max_duration_seconds` to 190. The landing page ends
     the call itself at three minutes, ten seconds earlier; this limit is the backstop. In the same place,
     turn **Bursting** off (on by default, it lets calls exceed the workspace's concurrency
     at double the price) and set the agent's **Concurrency limit** to about 5 (the default,
     -1, is no limit). These two are the ceiling under everything the budget cookie does
     not stop.
   - Under Security, turn Authentication on and leave the allowlist empty. Authentication
     makes the agent private, so only a ticket minted with your API key can start a
     conversation. ElevenLabs advises against combining authentication with an allowlist.
   - Under Security → Overrides, enable **Text-only mode**. The text session for a visitor
     without a microphone is sent as a per-conversation override, and ElevenLabs refuses an
     override whose field is not enabled. Do not enable text-only under Advanced: that
     would make every call text. In the same list, make sure the override for the
     **maximum duration** is off: enabled, a client could choose its own call length.
   - Under Privacy, set Retention to 0 days and turn Audio Saving off, so the demo keeps
     the landing page's promise to ask before recording. Both settings are documented on
     ElevenLabs's privacy page.
   - Write the agent's first message so that it says the receptionist is an AI, which
     Vietnamese law requires (Law 134/2025/QH15), and so that it does **not** say the call
     is recorded: the landing page promises the opposite, and the Privacy settings above
     make it true. Write its prompt so that it brings the call to a close at around two
     minutes and fifty seconds, before the limit cuts it off. A visitor's second call in
     the same hour is shorter — only what is left of their three minutes — and the page
     cuts it without warning the agent; nothing in the agent's setup can know about that.
   - Under Advanced → Turn timeout, consider more than the default 7 seconds. A visitor
     without a microphone types, and a Vietnamese sentence takes 15–30 seconds; the page
     tells the agent the visitor is typing, but a longer timeout is the backstop. The
     setting applies to voice calls too, where it is how long Linh waits in silence.
2. In the Cloudflare dashboard, create a Turnstile widget in **Invisible** mode for
   `fonnus.ai` and the Vercel preview hostnames. It gives a site key, which is public, and
   a secret key. For local development `.env.example` already carries Cloudflare's
   always-pass test pair, so no widget is needed to hear the agent on your machine.
3. In the Vercel project, add five environment variables — the first four marked
   Sensitive — and redeploy, because a variable applies only to new deployments. For
   local development, put them in `.env.local` instead.

```bash
ELEVENLABS_API_KEY=                # an API key from the ElevenLabs dashboard, restricted to Conversational AI if it offers scopes; it must be allowed to list conversations
ELEVENLABS_AGENT_ID=               # the agent's id; the browser never sees it
VOICE_DEMO_COOKIE_SECRET=          # a long random string (openssl rand -hex 32) that signs the budget cookie; a new value gives every visitor a fresh hour once
TURNSTILE_SECRET_KEY=              # the widget's secret key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=    # the widget's site key; public, inlined into the page
```

   The route is protected by the budget cookie and the Turnstile check, not by a rate
   limit: a browser whose hour is spent gets a `429` from the route itself, and a request
   without a valid challenge gets a `403`. The one Firewall rate-limit rule the Hobby plan
   allows — over `/api/leads*` and this route, keyed on IP, a window of ten minutes or
   less — is deferred and described in `PLAN.md` §Backlog; several devices on one clinic's
   wifi share an address, which is why it is not the budget's key. Turnstile's script is
   fetched from Cloudflare's own URL when the consent slot opens; a content security
   policy, when one arrives, must allow `script-src` and `frame-src` for
   `https://challenges.cloudflare.com`.

4. There is no switch: the demo is live as soon as the five variables are set and deployed.
   To turn it off again, unset `ELEVENLABS_API_KEY` and redeploy: the route answers `503`
   and the call screen tells the visitor it could not connect and offers to call again.

## Layout

```
src/
  app/            The route tree only: Next.js convention files, each page returning one feature component
  features/       One directory per product surface: auth today; receptionist, marketing, calls, … as the roadmap lands them
  api/            The one door to the network: contracts, the mock/live switch, errors
  server/         What runs only in a route handler: the marketing forms, written to a Google Sheet, and the live voice demo's token and budget routes
  session/        Who is signed in, and the gate on /app
  shell/          What every signed-in page shares: the frame and the nav
  design-system/  Brand primitives: drawn icons, logo, button, input
  ui/             The signed-in app's kit, which marketing never imports
  data/           Copy with no markup around it
  styles/tokens/  The design tokens, copied verbatim from ../Fonnus-Web-UI
docs/             The API contract, the field catalogue mapping, the UI rules, the ADRs
public/           Logo assets and the three sample-call recordings the "Khả năng" section plays
```

The rules behind this tree — which directory imports which, how files are named, where a
new thing goes — are in `docs/architecture.md`; the reasoning is
`docs/adr/0004-source-layout.md`.
