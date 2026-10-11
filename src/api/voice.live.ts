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
 * `microphone_denied`, `voice_unavailable` (no microphone API, the SDK failed
 * to load or start, or no connection within 10 seconds), and whatever
 * `http.ts` makes of the token route's refusal.
 */
import type { VoiceAgentState, VoiceApi, VoiceEndReason, VoiceEvent, VoiceSession } from './contracts'
import { ApiError } from './errors'
import { request } from './http'
import { createVoiceEvents } from './voice-events'

/** How long `startSession` may take before the demo falls back to the recording. */
const CONNECT_TIMEOUT_MS = 10_000
/*
 * The agent's own `max_duration_seconds` is 180. Closing first keeps the
 * ending the app's, with the app's words (ADR 0006 point 6).
 */
const MAX_CALL_MS = 175_000
/** While she listens, the caller's own voice drives a quieter pulse: she hears you. */

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
      throw new ApiError({ kind: 'unknown', code: 'microphone_denied', cause })
    }
    for (const track of stream.getTracks()) track.stop()
    throwIfAborted(signal)

    // An empty JSON body on purpose: the route answers 415 to anything that is
    // not `application/json` (docs/api-contract.md §5).
    const { token } = await request<{ token: string }>('/api/voice-demo/token', {
      method: 'POST',
      body: {},
      ownOrigin: true,
      signal,
    })
    throwIfAborted(signal)

    const { VoiceConversation } = await import('@elevenlabs/client').catch((cause: unknown) => {
      throw unavailable(cause)
    })
    throwIfAborted(signal)

    return startSession(
      (callbacks) => VoiceConversation.startSession({ conversationToken: token, connectionType: 'webrtc', ...callbacks }),
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
 * Starts the conversation under the connect deadline and wraps it as a
 * `VoiceSession`. A conversation that arrives after the deadline or an abort
 * is ended unheard, and its callbacks change nothing.
 */
function startSession(
  start: (callbacks: Callbacks) => Promise<Conversation>,
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
      clearTimeout(deadline)
      signal?.removeEventListener('abort', onAbort)
      reject(error)
    }
    const onAbort = () => {
      fail(canceled())
    }
    const deadline = setTimeout(() => {
      fail(unavailable())
    }, CONNECT_TIMEOUT_MS)
    signal?.addEventListener('abort', onAbort, { once: true })

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
          // started", so the recording takes over silently.
          fail(unavailable())
          return
        }
        settled = true
        clearTimeout(deadline)
        signal?.removeEventListener('abort', onAbort)
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
