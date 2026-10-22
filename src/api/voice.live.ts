/**
 * The voice demo against a real receptionist: the ElevenLabs stand-in of
 * ADR 0006. The browser talks to a private ElevenLabs agent, with a ticket
 * this app's own route mints (`POST /api/voice-demo/token`).
 * When Fonnus-BE serves a web voice gateway, this file dials it instead and
 * nothing above the `VoiceSession` interface changes. It is the `voice` group's
 * only implementation: there is no mock (ADR 0007).
 *
 * Two inputs share the route and the agent (ADR 0007). `voice` asks for the
 * microphone first and calls over WebRTC with a conversation token; `text`
 * never opens one and starts the SDK's text-only conversation over a
 * WebSocket with a signed URL, whose lines arrive as `message` events.
 *
 * `@elevenlabs/client` (and `livekit-client` under it) is imported dynamically
 * inside `connect`, never at module scope: the landing page's first load must
 * not carry it, and nothing here may run at import time.
 *
 * Every ticket costs a proof that the visitor is a browser (ADR 0009 point 5):
 * the caller's `challenge`, asked for after the microphone grant for a call and
 * first thing for a text one, inside the budget below, and posted as
 * `turnstile_token`. No proof is no ticket.
 *
 * `connect` rejects for everything that goes wrong before the conversation
 * starts: `microphone_unavailable` (voice only: the browser gave no microphone,
 * for any reason, and the caller connects again with `text`),
 * `voice_unavailable` (no proof, the SDK failed to load or start, or no
 * connection within the budget below), and whatever `http.ts` makes of the
 * token route's refusal — `budget_spent` among them, when the visitor's hour
 * is spent, and a `403` when the route refused the proof.
 *
 * The hour is the route's (ADR 0009): `budget` reads it from
 * `GET /api/voice-demo/budget`, and each ticket's answer says what that
 * session may spend, which is where the session's cap comes from.
 */
import type {
  VoiceAgentState,
  VoiceApi,
  VoiceBudget,
  VoiceEndReason,
  VoiceEvent,
  VoiceInput,
  VoiceSession,
} from './contracts'
import { ApiError } from './errors'
import { http, request } from './http'
import { createVoiceEvents } from './voice-events'

/*
 * How long the proof, the ticket, the SDK and the connection may take together
 * before the call is shown as failed. Counted from the microphone grant for a voice call
 * (the prompt waits on a person, not on the network) and from `connect` for a
 * text one.
 */
const CONNECT_BUDGET_MS = 15_000
/**
 * Exactly the three minutes the call screen counts down (ADR 0010). The
 * agent's own `max_duration_seconds` is 190: closing first keeps the ending
 * the app's, with the app's words (ADR 0006 point 6). What the ticket may
 * spend of the visitor's hour (ADR 0009) can only shorten it. Exported for the
 * tests.
 */
export const MAX_CALL_MS = 180_000

const TICKET_PATH = '/api/voice-demo/token'
const BUDGET_PATH = '/api/voice-demo/budget'

/**
 * The part of the SDK's `VoiceConversation` and `TextConversation` this file
 * uses, written out so the package's types are named nowhere at module scope.
 * The dynamic import's real type is checked against it.
 */
interface Conversation {
  endSession(): Promise<void>
  /** Throws on a text conversation, so it is called for voice only. */
  setMicMuted(isMuted: boolean): void
  getOutputVolume(): number
  sendUserMessage(text: string): void
  /** Throttled by the SDK itself, so it may be called on every keystroke. */
  sendUserActivity(): void
}

type Mode = Extract<VoiceAgentState, 'speaking' | 'listening'>

const canceled = (cause?: unknown) => new ApiError({ kind: 'canceled', cause })
const unavailable = (cause?: unknown) => new ApiError({ kind: 'unknown', code: 'voice_unavailable', cause })
const microphoneUnavailable = (cause?: unknown) =>
  new ApiError({ kind: 'unknown', code: 'microphone_unavailable', cause })

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw canceled()
}

export const voiceLive: VoiceApi = {
  budget(opts) {
    return http.get<VoiceBudget>(BUDGET_PATH, { ownOrigin: true, signal: opts?.signal })
  },

  async connect({ input, signal, challenge }) {
    throwIfAborted(signal)
    if (input === 'voice') await askForMicrophone(signal)

    // One budget for everything from here: the caller's abort, or the time running out.
    const timeout = AbortSignal.timeout(CONNECT_BUDGET_MS)
    const budget = signal ? AbortSignal.any([signal, timeout]) : timeout
    /** The caller's abort stays `canceled`; the budget running out is `voice_unavailable`. */
    const throwIfSpent = () => {
      throwIfAborted(signal)
      if (budget.aborted) throw unavailable()
    }
    // The proof and the SDK chunk are raced against the budget by hand: neither
    // is bound to honour a signal, and either alone could outlast the fifteen seconds.
    const spent = new Promise<never>((_, reject) => {
      budget.addEventListener(
        'abort',
        () => {
          reject(signal?.aborted ? canceled() : unavailable())
        },
        { once: true },
      )
    })

    // Fail closed: a proof that does not come is no ticket (ADR 0009 point 5).
    const proof = await Promise.race([
      Promise.resolve()
        .then(() => challenge(budget))
        .catch((cause: unknown) => {
          throwIfSpent()
          throw unavailable(cause)
        }),
      spent,
    ])
    throwIfSpent()

    const { ticket, hour } = await requestTicket(input, proof, budget).catch((cause: unknown) => {
      // `http.ts` reports the budget's abort as `canceled` or `timeout`; both
      // are this budget's. Any other refusal, `budget_spent` and a refused
      // proof included, is the route's and reaches the caller as `http.ts` built it.
      throwIfSpent()
      throw cause
    })
    throwIfSpent()

    const sdk = await Promise.race([
      import('@elevenlabs/client').catch((cause: unknown) => {
        throw unavailable(cause)
      }),
      spent,
    ])
    throwIfSpent()

    // Text goes over the WebSocket, not WebRTC: there the text-only override is
    // sent before the conversation starts and no audio is created, where the
    // WebRTC transport joins in voice, plays her voice, and switches too late.
    return startSession(
      input,
      (callbacks) =>
        input === 'text'
          ? sdk.Conversation.startSession({
              signedUrl: ticket,
              connectionType: 'websocket',
              textOnly: true,
              ...callbacks,
            })
          : sdk.VoiceConversation.startSession({ conversationToken: ticket, connectionType: 'webrtc', ...callbacks }),
      budget,
      signal,
      hour,
    )
  },
}

/**
 * A call's WebRTC conversation token, or a typed conversation's WebSocket
 * signed URL, with what that ticket may spend of the hour. `proof` is the
 * Turnstile token the route verifies before anything else it does.
 */
async function requestTicket(
  input: VoiceInput,
  proof: string,
  signal: AbortSignal,
): Promise<{ ticket: string; hour: VoiceBudget }> {
  if (input === 'text') {
    const { signed_url, remaining_ms, resets_at } = await request<{ signed_url: string } & VoiceBudget>(TICKET_PATH, {
      method: 'POST',
      body: { input: 'text', turnstile_token: proof },
      ownOrigin: true,
      signal,
    })
    return { ticket: signed_url, hour: { remaining_ms, resets_at } }
  }
  // JSON on purpose: the route answers 415 to anything that is not
  // `application/json` (docs/api-contract.md §5), and no `input` is a call.
  const { token, remaining_ms, resets_at } = await request<{ token: string } & VoiceBudget>(TICKET_PATH, {
    method: 'POST',
    body: { turnstile_token: proof },
    ownOrigin: true,
    signal,
  })
  return { ticket: token, hour: { remaining_ms, resets_at } }
}

/**
 * How long the session may run: what its ticket may spend, never past
 * `MAX_CALL_MS`. An answer without a usable number is held to the maximum,
 * not to zero, which would hang up the moment she answers.
 */
function capFor(hour: VoiceBudget): number {
  const remaining = hour.remaining_ms
  return Number.isFinite(remaining) ? Math.min(MAX_CALL_MS, Math.max(0, remaining)) : MAX_CALL_MS
}

/**
 * First, because it is the one step that shows the browser's prompt: no token
 * is minted for a visitor who refuses. The SDK opens its own stream, so this
 * one only asks the question and is released at once. A refusal, no
 * microphone, a busy one and no media API at all (plain http on a LAN address,
 * an old browser) have one outcome, the visitor types, so they share one code.
 */
async function askForMicrophone(signal: AbortSignal | undefined): Promise<void> {
  const media = navigator.mediaDevices as MediaDevices | undefined
  if (typeof media?.getUserMedia !== 'function') throw microphoneUnavailable()
  let stream: MediaStream
  try {
    stream = await media.getUserMedia({ audio: true })
  } catch (cause) {
    throwIfAborted(signal)
    throw microphoneUnavailable(cause)
  }
  for (const track of stream.getTracks()) track.stop()
  throwIfAborted(signal)
}

/** The SDK callbacks this file listens to, in the SDK's own shapes. */
interface Callbacks {
  onStatusChange: (prop: { status: 'disconnected' | 'connecting' | 'connected' | 'disconnecting' }) => void
  onModeChange: (prop: { mode: Mode }) => void
  onMessage: (prop: { role: 'agent' | 'user'; message: string }) => void
  onDisconnect: (details: { reason: 'error' | 'agent' | 'user'; context?: { type: string } | undefined }) => void
  // No `onError`: the vendor's wording is never shown, and not logged either.
  // The SDK's default handler does nothing.
}

/**
 * Starts the conversation under what is left of the connect budget and wraps
 * it as a `VoiceSession`. A conversation that arrives after the budget fired
 * is ended unheard, and its callbacks change nothing. `signal` is the caller's
 * own, read only to tell an abort from the budget running out. `hour` is the
 * ticket's answer: the session ends with `timeout` once its `remaining_ms` has
 * run, clamped to `MAX_CALL_MS`. Exported for the tests.
 */
export function startSession(
  input: VoiceInput,
  start: (callbacks: Callbacks) => Promise<Conversation>,
  budget: AbortSignal,
  signal: AbortSignal | undefined,
  hour: VoiceBudget,
): Promise<VoiceSession> {
  // A text conversation's lines are kept, not replaced by the next event: the
  // SDK may deliver her first one before this resolves and anyone subscribes.
  const events = createVoiceEvents<VoiceEvent>({ type: 'state', state: 'connecting' }, (e) => e.type === 'message')
  const text = input === 'text'
  let conversation: Conversation | null = null
  /** Unknown until the first mode change; the SDK does not announce its starting mode. */
  let mode: Mode | null = null
  let ended = false
  let closing = false
  /** `connect` has rejected: whatever the SDK still reports belongs to no one. */
  let discarded = false
  /** The SDK reported a disconnect before `startSession` resolved. */
  let droppedEarly = false
  let capTimer: ReturnType<typeof setTimeout> | undefined
  /** Set where `capTimer` is armed, before the session is handed over. */
  let endsAt = Number.POSITIVE_INFINITY

  const setMode = (next: Mode) => {
    mode = next
    events.emit({ type: 'state', state: next })
  }

  const end = (reason: VoiceEndReason) => {
    if (ended) return
    ended = true
    clearTimeout(capTimer)
    events.emit({ type: 'ended', reason })
  }

  const session: VoiceSession = {
    budget: hour,

    get endsAt() {
      return endsAt
    },

    subscribe(listener) {
      return events.subscribe(listener)
    },

    setMicEnabled(on) {
      if (!ended && !text) conversation?.setMicMuted(!on)
      return Promise.resolve()
    },

    sendText(typed) {
      const line = typed.trim()
      if (!line || ended || !conversation) return
      if (text) {
        // Her reply ends the wait: `onMessage` sets her back to listening.
        events.emit({ type: 'message', from: 'visitor', text: line })
        setMode('speaking')
      }
      conversation.sendUserMessage(line)
    },

    noteActivity() {
      if (!ended) conversation?.sendUserActivity()
    },

    getAmplitude() {
      if (ended || !conversation || text) return null
      // Her voice only: the orb and its aura follow it while she speaks and
      // rest otherwise, so a listening level would be dead weight.
      return mode === 'speaking' ? conversation.getOutputVolume() : null
    },

    async close() {
      if (closing) return
      closing = true
      end('user')
      events.close()
      try {
        await conversation?.endSession()
      } catch {
        // Already gone, or going: there is nothing left to release.
      }
    },
  }

  return new Promise<VoiceSession>((resolve, reject) => {
    let settled = false

    const fail = (error: ApiError) => {
      if (settled) return
      settled = true
      discarded = true
      budget.removeEventListener('abort', onAbort)
      reject(error)
    }
    const onAbort = () => {
      fail(signal?.aborted ? canceled() : unavailable())
    }
    budget.addEventListener('abort', onAbort, { once: true })

    start({
      onStatusChange({ status }) {
        if (discarded || ended) return
        // `connected` says nothing the screen shows: her first mode change follows.
        if (status === 'connecting') events.emit({ type: 'state', state: 'connecting' })
      },
      onModeChange({ mode: next }) {
        // In a text conversation the SDK's mode is who is audible in the room,
        // and nobody is; the lines decide instead.
        if (discarded || ended || text) return
        setMode(next)
      },
      onMessage({ role, message }) {
        // A voice call shows no transcript. The visitor's own line was emitted
        // by `sendText`, whether or not the vendor echoes it.
        if (discarded || ended || !text || role !== 'agent') return
        events.emit({ type: 'message', from: 'agent', text: message })
        setMode('listening')
      },
      onDisconnect(details) {
        if (discarded) return
        if (!settled) {
          droppedEarly = true
          return
        }
        // A close or the cap ended it first and already said why.
        if (closing || ended) return
        // The agent's own 190 s cap, if it beats the client's one (a
        // throttled background tab): still the duration cap, not a failure.
        if (details.reason === 'error' && details.context?.type === 'max_duration_exceeded') {
          end('timeout')
          return
        }
        end(details.reason === 'agent' ? 'agent' : 'error')
      },
    }).then(
      (started) => {
        if (settled) {
          void started.endSession().catch(() => undefined)
          return
        }
        if (droppedEarly) {
          // Gone before it was handed over: still "before the conversation
          // started", so `connect` rejects and the screen says it could not
          // connect. Ended anyway, so a half-closed peer never stays open.
          fail(unavailable())
          void started.endSession().catch(() => undefined)
          return
        }
        settled = true
        budget.removeEventListener('abort', onAbort)
        conversation = started
        // Connected and nothing said yet: she waits for the visitor, rather
        // than the line sitting on "connecting" until her first message.
        if (text && mode === null) setMode('listening')
        const cap = capFor(hour)
        endsAt = Date.now() + cap
        capTimer = setTimeout(() => {
          end('timeout')
          void started.endSession().catch(() => undefined)
        }, cap)
        resolve(session)
      },
      (cause: unknown) => {
        fail(unavailable(cause))
      },
    )
  })
}
