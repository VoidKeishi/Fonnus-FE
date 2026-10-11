# ADR 0007: The voice demo has no recording, and a visitor without a microphone talks to the agent in text

**Status:** accepted · **Date:** 2026-10-11 · Amends [ADR 0006](./0006-elevenlabs-landing-voice-demo.md) points 2, 7 and 10

## Decision

The "Nghe thử" call on the landing page answers with the ElevenLabs agent or not at all.
The recorded greeting and the timed script that stood in for it — as the mock of the `voice`
group and as the silent fallback whenever a live call could not connect — are deleted. A
visitor whose browser gives no microphone still talks to the same agent, by typing; the
agent answers in text, because that is the only mode the vendor offers without a microphone.

1. **The `voice` group has no mock and is always live.** `src/api/index.ts` binds
   `api.voice` to `voice.live.ts` unconditionally; `voice` leaves `API_GROUPS`, so
   `NEXT_PUBLIC_API_LIVE_GROUPS` no longer mentions it and the dev-mode "faked in the
   browser" line never lists it. This is the one exception to ADR 0003 point 1 ("each group
   has a `*.mock.ts`"), and the reason is the thing being faked: a conversation. A faked
   conversation is either a recording, which is what this ADR removes, or a canned sentence,
   which is a recording in text. Without `ELEVENLABS_API_KEY` the token route answers `503`
   and the call screen says it could not connect; that is also what a developer sees on a
   machine without the two variables, and `.env.local` is the way to hear the agent locally.
   `NEXT_PUBLIC_MOCK_FAILURE_RATE` does not apply to `voice`; its error paths are reached by
   unsetting the key (the `503`) and by the unit tests of `voice.live.ts`.
2. **Two inputs, one session interface, one token.** `connect` takes `input: 'voice' |
   'text'`. `voice` is ADR 0006's path unchanged: microphone first, then the token, the SDK
   and a WebRTC conversation. `text` skips the microphone, mints the same token from the same
   route, and starts the SDK's text-only conversation (`textOnly: true`, over the same WebRTC
   transport, so `POST /api/voice-demo/token` and `docs/api-contract.md` §5's route do not
   change). A text session never opens a microphone, plays no audio, reports `getAmplitude()`
   as `null`, treats `setMicEnabled` as a no-op, and delivers the conversation as `message`
   events: `{ type: 'message', from: 'agent' | 'visitor', text }`. The session emits the
   visitor's own line itself when `sendText` is called, so the screen has one source for the
   thread and never depends on whether the vendor echoes typed input.
3. **The microphone decides the input; the hook decides the screen.** The consent button
   connects with `input: 'voice'`. When `getUserMedia` fails for any reason — refused by the
   visitor or the page's permissions, no microphone, a busy one, or no media API at all (an
   insecure context) — `connect` rejects with `microphone_unavailable`, and the hook connects
   again with `input: 'text'` inside the same tap. Every other rejection (`503` from the
   route, the SDK failing to load, no conversation within the fifteen-second budget) is a
   failed call: the screen says so and offers to call again. Nothing is silent any more.
4. **The call screen has two shapes, and the voice one is the prototype's.** With `input:
   'voice'` the screen is exactly what ADR 0006 point 10 settled: orb, one state line, chips,
   the typed line with a microphone toggle, the footnote, and no transcript. With `input:
   'text'` the screen shows, under a smaller orb, one line saying why this is a text
   conversation, the thread of lines so far, the chips, and the typed line without the
   microphone toggle. The thread uses the one transcript shape the landing page already has —
   the speaker-labelled lines of the "Khả năng" sample calls — rather than chat bubbles
   (`docs/ui-ux-principles.md` §1), and the receptionist's lines sit on blush, which means
   speech. Two shapes for one screen is a deliberate exception to §1: the voice screen is the
   product's promise and stays as designed, and the text shape exists only for the visitor
   the voice shape cannot serve.
5. **A failed connection is a state, not a fallback.** The slot under the orb gets a third
   ending shape beside consent and the three endings: "Không kết nối được với Linh lúc này.
   Bạn thử gọi lại sau một lát." and "Gọi lại". Like the `error` ending, it offers no
   sign-up link; a visitor the demo failed is not sent to a form.
6. **The 175-second cap and the three endings apply to a text session unchanged, and the
   thread stays.** The agent's `max_duration_seconds` counts a text conversation too. In a
   text session an ending (or a failed connection) replaces the state lines above the
   thread, never the thread itself: the transcript is what the visitor came for, and Linh's
   closing line is in it.
7. **One line of consent covers both inputs.** The consent line is shown before the
   browser has answered about the microphone, so it names both: the visitor's voice or their
   typed messages are processed to answer and not kept. The agent's first message still
   identifies it as an AI; in a text session that message arrives as the first line of the
   thread.
8. **The owner enables one more thing on the agent.** The text-only session is sent as a
   runtime override (`conversation.text_only`), and ElevenLabs refuses an override whose
   field is not enabled in the agent's Security tab. "Text-only mode" is enabled there, and
   nowhere else: enabling text-only under Advanced would make every call text.

## Why

- A recording that answers a question with a timed pause reads, to a clinic owner who has
  just been told "Bấm để nghe Linh trả lời", as the product pretending. The fallback of ADR
  0006 point 7 was justified when the recording was all there was; now that the agent
  exists, the recording is the thing that can mislead, and the one honest alternative to a
  working agent is saying it did not work.
- The microphone is refused more often than it is broken: a visitor at a reception desk, a
  browser that blocked the site once, a phone in a quiet room. Sending that visitor away, or
  to a recording, loses the demo at the moment they asked for it. The SDK offers one path
  without a microphone and it is text in both directions (`TextConversation` on
  `@elevenlabs/client` 1.27.0: no `getUserMedia`, no audio output, replies through
  `onMessage`); a path where the visitor types and the agent speaks does not exist, so the
  text shape has to show the agent's words.
- The same token, route and transport for both inputs keeps `src/server/` untouched and the
  contract's route section unchanged. The alternative — a WebSocket signed URL, the SDK's
  default for text — would add a second ticket kind to the route for no gain the visitor can
  see.
- A group without a mock is a cost: a developer without the two variables cannot hear the
  demo, and the mock-only error walk of ADR 0003 point 4 is lost for this group. It is
  accepted because the only honest mock of a conversation is no conversation, and because
  the error paths of `voice.live.ts` are unit-tested rather than walked.

## Rejected

- **Keeping a "silent mock"**: a session with no audio that answers every line with one
  fixed sentence. It preserves the seam's symmetry and the error walk, but it is a canned
  answer under a real orb, and anyone opening `pnpm dev` without reading `.env.example`
  would take it for a broken demo.
- **One chat-shaped screen for both inputs**, with the agent's words and the visitor's
  transcribed speech shown in the voice call too. It would satisfy §1 and help a visitor in
  a noisy room, but it reverses the prototype's decision that the call screen is voice-only,
  shrinks the orb into a decoration beside a scrolling thread, and needs the phone layout
  redrawn. Worth revisiting if visitors ask to read what they heard.
- **A "Nhắn tin thay vì gọi" button on the consent screen**, so that text is a choice rather
  than a consequence. Reasonable, and one line of code once the text input exists, but it
  changes the consent screen the prototype drew for a reason nobody has observed yet. A
  backlog row.
- **Treating a missing microphone differently from a refused one.** Two codes and two
  lines of copy for the same outcome — the visitor types — is a distinction without a
  decision behind it.
- **A WebSocket signed URL for the text session.** See "Why".

## Settled by the first text session (2026-10-11, local, microphone blocked)

- The SDK's text-only conversation over the WebRTC transport, on the same conversation
  token the voice path uses, joins the room and delivers `agent_response` events: the
  agent's first message arrived as the first line of the thread. No signed URL is needed.
- What was not planned for: the agent's `turn_timeout` (7 s by default) counts while the
  visitor types, and the agent ended the conversation before the first typed line was
  sent. The session now reports typing through `noteActivity()` → the SDK's
  `sendUserActivity()`, which the SDK documents as the way to tell the agent the visitor is
  present and typing. Whether that alone holds the turn open for a slow typist is the next
  thing a text session settles; raising the agent's turn timeout is the owner's lever if
  not (README).

## Assumed, to confirm during the build

- A text-only session that ElevenLabs refuses because the override is not enabled does
  **not** surface as a failed `startSession`: the SDK resolves once the room is joined and
  the override is published, before the server has judged it, and the room closing
  afterwards reaches the session as `onDisconnect({ reason: 'agent' })`. The screen would
  then show "Linh đã kết thúc cuộc gọi thử…" with the sign-up link, not the failed state.
  That is the misconfigured case only — point 8 is the fix — and it is not special-cased in
  code; whether the refusal looks like that, or like a connection that never joins and
  therefore does fail, is settled by starting one text session before the owner enables
  the override.
- The orb's placement re-measures its slot when the slot changes size, so the smaller orb
  of the text shape lands where the slot is and not where the voice slot was.

## Revisit when

- Visitors ask to read what Linh said in a voice call. The chat-shaped screen rejected
  above becomes the design, and the voice input emits `message` events too.
- Fonnus-BE serves the web voice gateway (ADR 0006's first trigger). The gateway has to
  offer a text mode or this ADR's text input dies with the vendor; that is a row in
  `docs/open-questions.md` the day the gateway is specified.
- A second group arrives that cannot honestly be mocked. Point 1's exception becomes a rule
  in ADR 0003 rather than a footnote here.
