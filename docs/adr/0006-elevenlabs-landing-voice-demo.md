# ADR 0006: The landing page's voice demo talks to an ElevenLabs agent, as a stand-in behind the `voice` seam

**Status:** accepted · **Date:** 2026-10-11

## Decision

The "Nghe thử" orb on the landing page opens a real conversation: the visitor speaks, a
receptionist answers in Vietnamese, for at most three minutes. Until `../Fonnus-BE` serves a
web voice gateway into the pipeline, the receptionist is an agent the owner configured on
ElevenLabs Conversational AI. The browser connects to ElevenLabs directly; this app only
mints the ticket that lets it.

The agent is a stand-in. Everything below is shaped so that the day Fonnus-BE's gateway
exists, one file changes and no screen does.

1. **The `voice` group arrives, with the landing demo as its first consumer** (ADR 0003
   point 3; `docs/architecture.md` lists it as F3's). Its interface is the prototype's
   `VoiceSession` (`../Fonnus-Web-UI/src/api/contracts.ts`), trimmed to what the call screen
   reads today: `connect({ mode: 'landing-demo', signal })` returns a session with
   `subscribe(listener)` for `state` and `ended` events, `setMicEnabled`, `sendText`,
   `getAmplitude` polled from the orb's animation frame, and `close`. No transcript event,
   no voice picker, no `thinking` state: nothing ships ahead of its first consumer, and the
   call screen shows none of them (see "What the prototype settled" below).
2. **Three implementations, one interface.** `voice-scripted.ts` is today's demo — Linh's
   recorded greeting through an `AnalyserNode`, then "listening" — moved out of
   `src/features/marketing/orb/greeting-player.ts` and wrapped as a `VoiceSession`.
   `voice.mock.ts` is the scripted session behind `maybeFail` — not `delay`: the recording
   is the latency, and a delay would push the greeting out of the click's user gesture that
   autoplay needs — so `NEXT_PUBLIC_MOCK_FAILURE_RATE=1` walks the fallback path.
   `voice.live.ts` is ElevenLabs.
   `src/api/index.ts` chooses mock or live as for every other group;
   `NEXT_PUBLIC_API_LIVE_GROUPS=voice` turns the demo live.
3. **The browser connects to a third party.** ADR 0003 says this app "talks to exactly one
   server"; this is its one named exception, confined to `voice.live.ts`. The session is
   WebRTC through `@elevenlabs/client`, which the file imports dynamically inside `connect()`
   — the package and its `livekit-client` dependency never load with the page, only with the
   first click, and nothing runs at import time (CLAUDE.md, the `localStorage` rule). The
   landing page's server HTML and its first-load JavaScript do not change size.
4. **A fourth runtime dependency, `@elevenlabs/client`** (which brings `livekit-client` and
   `@elevenlabs/types`). ADR 0001 point 4 said the next dependency would come with a roadmap
   row; this is it. Not `@elevenlabs/react`: `src/api/` imports no React, and the hook this
   repo already has is the React side.
5. **The agent is private; this app mints the ticket.** `POST /api/voice-demo/token` on this
   app's own origin calls `GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=…`
   with the `xi-api-key` header and answers `200 { token }`, `Cache-Control: no-store`. The
   token is a WebRTC conversation token the browser hands to `startSession`. The route reads
   two server-side variables, `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID`, in
   `src/server/env.ts`; neither is `NEXT_PUBLIC_`, so the agent id and the key stay off the
   bundle. A missing variable is a `503`; an ElevenLabs failure is a `502` with no upstream
   text; both are logged as step plus upstream status, never the key or the token.
6. **Four limits, in layers.** The agent's `max_duration_seconds` is 180 in the ElevenLabs
   dashboard, and the client closes the session itself at 175 seconds so the ending is the
   app's, with the app's words. A Vercel Firewall rate-limit rule on `/api/voice-demo/token`
   keyed on IP answers `429`, as ADR 0005 point 9 does for the forms — code, not a Firewall
   rule, cannot count across function instances. The kill switch is unsetting
   `ELEVENLABS_API_KEY`: the route answers `503` and the orb falls back to the scripted demo
   with no visible break. The plan's concurrency limit is the ceiling under everything. A
   token is valid for fifteen minutes and is not single-use, so the rate limit protects
   minting, and the duration cap and concurrency protect everything after.
7. **Failure is handled in two ways, by when it happens.** Before the conversation has
   started — microphone refused, token refused, SDK failed to load, or no connection within
   fifteen seconds of the microphone being granted (token, SDK and WebRTC together) — the
   hook opens the scripted session instead, silently, because the visitor has not yet been
   promised anything a recording cannot keep. Once the
   agent has spoken and the connection drops, the screen says so and offers to call again,
   because silence there reads as the product failing. (`docs/ui-ux-principles.md` §4: a
   state that cannot be used still has to teach.)
8. **Consent before the microphone.** The visitor's voice is personal data under PDPL (Law
   91/2025/QH15) and leaves the country to a US-hosted vendor (`CONTEXT.md` §Legal). The call
   screen therefore opens with one line saying what happens and one button that starts the
   call; `getUserMedia` and the token request begin inside that tap, never on the orb click.
   The agent's first message identifies itself as an AI (Law 134/2025/QH15); that is the
   agent's configuration, checked in the owner's setup list, not code.
9. **`src/server/` gets its rules**, which ADR 0005's last revisit trigger asked for the day
   a second secret arrived. They are written into `docs/architecture.md` §`src/server/` and
   are: one module per upstream service, each starting with `import 'server-only'`; `env.ts`
   exposes one function per group of variables, read per request, `null` when incomplete;
   every handler is a status ladder that ends in one upstream call under one deadline; a
   response never carries upstream text; a log line carries the step and the upstream status
   and nothing a visitor typed or a credential. The lint fence (only `src/app/` imports
   `src/server/`; `src/server/` imports only itself, four pure `src/api/` files and `node:`)
   stands unchanged.
10. **What the prototype settled stays settled.** The call screen keeps its title
    "Nha khoa Minh Anh · bản mô phỏng", its chips, its typed line, its microphone toggle and
    its footnote, and shows no transcript. The voice picker is removed: the agent has one
    voice, and a control that changes nothing is a promise the screen cannot keep. It comes
    back when the agent has a second voice (`PLAN.md` backlog).

## Why

- The hero says "Bấm để nghe Linh trả lời ngay trên trình duyệt", and today nothing
  answers. Fonnus-BE is an empty directory; the owner has an ElevenLabs agent that already
  speaks Vietnamese and has been tested. A demo that answers now, behind the seam the
  gateway will later fill, is worth more than a faithful demo later.
- The prototype had already drawn the seam (`VoiceSession`, `mode: 'landing-demo'`) and left
  `voice.live.ts` rejecting with `voice_transport_undecided`. The transport is now decided
  for the stand-in, and the interface survives the vendor because it exposes a microphone
  boolean, a text line and a polled loudness, not frames, codecs or vendor events.
- A public agent needs only an agent id and a domain allowlist, which checks the request's
  `Origin` header. A browser cannot forge that header; a script can, and the id is in the
  bundle. The exposure is then the plan's concurrency times three minutes, continuously,
  with nothing of ours to switch off and no log of who called. A private agent moves the
  one thing that costs money behind a route this app controls, which is also where the
  rate limit, the kill switch and the usage log live. Preview deployments work as well,
  which an exact-match allowlist of ten hostnames cannot allow.
- WebRTC over WebSocket for the audio: Opus with jitter handling on a phone's connection,
  which is where the visitor usually is. The SDK defaults to it for voice; the token
  endpoint is the one that goes with it.
- ADR 0003 point 5 rejected a backend-for-frontend because there was no secret to justify
  the hop and a cookie to forward. Here there is a secret and no cookie — the same two facts
  that admitted the `leads` handlers in ADR 0005.

## Rejected

- **The embeddable widget (`<elevenlabs-convai>`).** Half a day, but it is ElevenLabs's
  orb, its terms modal and its labels beside or instead of the one the prototype designed,
  and it supports only public agents. The prototype is the design authority (ADR 0002).
- **A public agent with a domain allowlist.** See "Why". Reversible to and from the chosen
  posture in hours — the ADR records the trade so it is not argued again.
- **`@elevenlabs/react`.** It is `@elevenlabs/client` plus a provider and hooks this repo
  has its own versions of, and `src/api/` may not import React.
- **Importing the SDK statically.** The landing page is the acquisition surface and is
  server-rendered for crawlers; `livekit-client` has no business in its first load.
- **A WebSocket signed URL instead of a WebRTC token.** Same pattern, worse audio on a
  mobile connection, and not the SDK's default for voice.
- **Rate limiting in the route handler.** Function instances share no memory (ADR 0005
  point 9).
- **Showing the transcript the SDK provides.** The prototype decided the screen is
  voice-only; changing it is a design change, declined for now.
- **Waiting for Fonnus-BE.** Q21 has been open since September and the orb has been silent
  since.

## Assumed, to confirm during the build

- When the fifteen-second budget fires while the WebRTC room is still negotiating, the SDK
  keeps the microphone open until its own connection attempt settles — a few seconds in which
  the microphone indicator is on while the screen plays the recording. The session ends that
  conversation as soon as it resolves; there is no cheaper handle in the SDK. Settled by
  watching the indicator on a throttled connection; if it matters, the budget grows.
- The agent's privacy settings — Retention at 0 days and Audio Saving off, both documented
  by ElevenLabs — are what keeps the landing page's promise "Xin phép trước khi ghi âm".
  Settled when the owner sets them; the demo must not go live before.
- `@elevenlabs/client`'s WebRTC path loads its audio worklets in a way `next build` and
  Vercel serve without configuration. Settled by the first live call on a preview deploy.
- The hostnames the SDK dials (`api.elevenlabs.io` and the WebRTC endpoints) are what a CSP
  under F7 must allow. Settled by reading the network panel during the first live call and
  recorded in F7's ADR.
- `getOutputVolume()` from the SDK is a usable loudness for the orb's waves at the envelope
  `orb-motion.ts` already applies. Settled by looking at the orb during the first live call.
- A Vercel Firewall fixed-window rule can key on IP over one path and answer `429`, as ADR
  0005 assumed for `/api/leads*`. That rule has not been created yet either.

## Revisit when

- Fonnus-BE ships the web voice gateway. `voice.live.ts` dials it instead, the token route,
  `src/server/elevenlabs-token.ts` and the two variables are deleted, and points 3–6 of this
  ADR are history. The interface, the hook and the screen do not change.
- The agent has a second Vietnamese voice. The picker returns, mapped to voice ids.
- The F3 try-out arrives and wants `mode: 'tenant-preview'`. It needs an authenticated
  session and the tenant's own configuration, which only Fonnus-BE can serve; it does not
  reuse the ElevenLabs path.
- Usage shows abuse the rate limit does not stop. The next steps are a device cookie
  counted by the route and a Firewall challenge, in that order.
- F7 adds security headers. `connect-src` and `worker-src` must name the hosts recorded
  above, or the demo dies silently after an unrelated deploy.
