/**
 * The voice demo against a real receptionist: the ElevenLabs stand-in of
 * ADR 0006. The browser talks to a private ElevenLabs agent over WebRTC, with
 * a conversation token this app's own route mints (`POST /api/voice-demo/token`).
 * When Fonnus-BE serves a web voice gateway, this file dials it instead and
 * nothing above the `VoiceSession` interface changes.
 *
 * `@elevenlabs/client` (and `livekit-client` under it) is imported dynamically
 * inside `connect`, never at module scope: the landing page's first load must
 * not carry it, and nothing here may run at import time.
 *
 * `connect` rejects, and the call demo falls back to the scripted session, for
 * everything that goes wrong before the conversation starts (ADR 0006 point 7):
 * `microphone_denied` (the visitor or the page's permissions refused it),
 * `voice_unavailable` (no microphone API or no microphone, the SDK failed to
 * load or start, or no connection within the budget below), and whatever
 * `http.ts` makes of the token route's refusal.
 */
import type { VoiceAgentState, VoiceApi, VoiceEndReason, VoiceEvent, VoiceSession } from './contracts'
import { ApiError } from './errors'
import { request } from './http'
import { createVoiceEvents } from './voice-events'

/*
 * How long the token, the SDK and the connection may take together before the
 * demo falls back to the recording. Counted from the microphone grant: the
 * prompt waits on a person, not on the network.
 */
const CONNECT_BUDGET_MS = 15_000
/**
 * The agent's own `max_duration_seconds` is 180. Closing first keeps the
 * ending the app's, with the app's words (ADR 0006 point 6). Exported for the tests.
 */
export const MAX_CALL_MS = 175_000

/**
 * The part of the SDK's `VoiceConversation` this file uses, written out so the
 * package's types are named nowhere at module scope. The dynamic import's real
 * type is checked against it.
 */
interface Conversation {
  endSession(): Promise<void>
  setMicMuted(isMuted: boolean): void
  getOutputVolume(): number
  sendUserMessage(text: string): void
}

const canceled = (cause?: unknown) => new ApiError({ kind: 'canceled', cause })
const unavailable = (cause?: unknown) => new ApiError({ kind: 'unknown', code: 'voice_unavailable', cause })

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw canceled()
}

/**
 * A refusal by the visitor or by the page's permissions; a missing or busy device is not one.
 * Exported for the tests.
 */
export function isRefusal(cause: unknown): boolean {
  const name = typeof cause === 'object' && cause !== null && 'name' in cause ? cause.name : undefined
  return name === 'NotAllowedError' || name === 'SecurityError'
}

export const voiceLive: VoiceApi = {
  async connect({ signal }) {
    throwIfAborted(signal)

    // Absent outside a secure context (plain http on a LAN address) and in old browsers.
    const media = navigator.mediaDevices as MediaDevices | undefined
    if (typeof media?.getUserMedia !== 'function') throw unavailable()

    // First, because it is the one step that shows the browser's prompt: no
    // token is minted for a visitor who refuses. The SDK opens its own stream,
    // so this one only asks the question and is released at once.
    let stream: MediaStream
    try {
      stream = await media.getUserMedia({ audio: true })
    } catch (cause) {
      throw isRefusal(cause) ? new ApiError({ kind: 'unknown', code: 'microphone_denied', cause }) : unavailable(cause)
    }
    for (const track of stream.getTracks()) track.stop()
    throwIfAborted(signal)

    // One budget for everything from here: the caller's abort, or the time running out.
    const timeout = AbortSignal.timeout(CONNECT_BUDGET_MS)
    const budget = signal ? AbortSignal.any([signal, timeout]) : timeout
    /** The caller's abort stays `canceled`; the budget running out is `voice_unavailable`. */
    const throwIfSpent = () => {
      throwIfAborted(signal)
      if (budget.aborted) throw unavailable()
    }

    // An empty JSON body on purpose: the route answers 415 to anything that is
    // not `application/json` (docs/api-contract.md §5).
    const { token } = await request<{ token: string }>('/api/voice-demo/token', {
      method: 'POST',
      body: {},
      ownOrigin: true,
      signal: budget,
    }).catch((cause: unknown) => {
      // `http.ts` reports the budget's abort as `canceled` or `timeout`; both are this budget's.
      throwIfSpent()
      throw cause
    })
    throwIfSpent()

    // A dynamic import takes no signal, so a chunk that never arrives is raced
    // against the budget by hand; otherwise it alone could outlast the fifteen seconds.
    const spent = new Promise<never>((_, reject) => {
      budget.addEventListener(
        'abort',
        () => {
          reject(signal?.aborted ? canceled() : unavailable())
        },
        { once: true },
      )
    })
    const { VoiceConversation } = await Promise.race([
      import('@elevenlabs/client').catch((cause: unknown) => {
        throw unavailable(cause)
      }),
      spent,
    ])
    throwIfSpent()

    return startSession(
      (callbacks) => VoiceConversation.startSession({ conversationToken: token, connectionType: 'webrtc', ...callbacks }),
      budget,
      signal,
    )
  },
}

/** The SDK callbacks this file listens to, in the SDK's own shapes. */
interface Callbacks {
  onStatusChange: (prop: { status: 'disconnected' | 'connecting' | 'connected' | 'disconnecting' }) => void
  onModeChange: (prop: { mode: 'speaking' | 'listening' }) => void
  onDisconnect: (details: { reason: 'error' | 'agent' | 'user'; context?: { type: string } | undefined }) => void
  // No `onError`: the vendor's wording is never shown, and not logged either.
  // The SDK's default handler does nothing.
}

/**
 * Starts the conversation under what is left of the connect budget and wraps
 * it as a `VoiceSession`. A conversation that arrives after the budget fired
 * is ended unheard, and its callbacks change nothing. `signal` is the caller's
 * own, read only to tell an abort from the budget running out. Exported for the tests.
 */
export function startSession(
  start: (callbacks: Callbacks) => Promise<Conversation>,
  budget: AbortSignal,
  signal: AbortSignal | undefined,
): Promise<VoiceSession> {
  const events = createVoiceEvents<VoiceEvent>({ type: 'state', state: 'connecting' })
  let conversation: Conversation | null = null
  /** Unknown until the first mode change; the SDK does not announce its starting mode. */
  let mode: Extract<VoiceAgentState, 'speaking' | 'listening'> | null = null
  let ended = false
  let closing = false
  /** `connect` has rejected: whatever the SDK still reports belongs to no one. */
  let discarded = false
  /** The SDK reported a disconnect before `startSession` resolved. */
  let droppedEarly = false
  let capTimer: ReturnType<typeof setTimeout> | undefined

  const end = (reason: VoiceEndReason) => {
    if (ended) return
    ended = true
    clearTimeout(capTimer)
    events.emit({ type: 'ended', reason })
  }

  const session: VoiceSession = {
    subscribe(listener) {
      return events.subscribe(listener)
    },

    setMicEnabled(on) {
      if (!ended) conversation?.setMicMuted(!on)
      return Promise.resolve()
    },

    sendText(text) {
      const line = text.trim()
      if (!line || ended) return
      conversation?.sendUserMessage(line)
    },

    getAmplitude() {
      if (ended || !conversation) return null
      // Her voice only: the orb reads the amplitude while she speaks and draws its
      // own idle pulse otherwise, so a listening level would be dead weight.
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
        if (discarded || ended) return
        mode = next
        events.emit({ type: 'state', state: next })
      },
      onDisconnect(details) {
        if (discarded) return
        if (!settled) {
          droppedEarly = true
          return
        }
        // A close or the cap ended it first and already said why.
        if (closing || ended) return
        // The agent's own 180 s cap, if it beats the client's 175 s one (a
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
          // started", so the recording takes over silently. Ended anyway, so
          // a half-closed peer never stays open behind the recording.
          fail(unavailable())
          void started.endSession().catch(() => undefined)
          return
        }
        settled = true
        budget.removeEventListener('abort', onAbort)
        conversation = started
        capTimer = setTimeout(() => {
          end('timeout')
          void started.endSession().catch(() => undefined)
        }, MAX_CALL_MS)
        resolve(session)
      },
      (cause: unknown) => {
        fail(unavailable(cause))
      },
    )
  })
}
