import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { VoiceBudget, VoiceEvent, VoiceInput, VoiceSession } from './contracts'
import { ApiError } from './errors'
import { MAX_CALL_MS, startSession, voiceLive } from './voice.live'

/*
 * The live session decides what the visitor feels at once. Before the
 * conversation starts, every failure must reject, so the screen says the call
 * could not connect instead of hanging on "Đang kết nối…" — and a conversation
 * that turns up after that must be hung up, or she answers in the background
 * of a failed call. A browser that gives no microphone, for any reason, must
 * reject with the one code that turns the call into a typed conversation, and
 * that conversation must never touch the microphone. After it starts, the
 * SDK's disconnect has to become the one ending the screen shows, said once
 * and with the right reason, and its cap must be what the ticket said the
 * visitor's hour has left. None of it needs a microphone or a network: the
 * SDK and the token request are stubbed and their callbacks called by hand.
 */

const stubs = vi.hoisted(() => ({
  request: vi.fn<(path: string, opts: Record<string, unknown>) => Promise<Record<string, unknown>>>(),
  get: vi.fn<(path: string, opts: Record<string, unknown>) => Promise<unknown>>(),
  textStart: vi.fn<(options: Record<string, unknown>) => Promise<unknown>>(),
  voiceStart: vi.fn<(options: Record<string, unknown>) => Promise<unknown>>(),
}))

vi.mock('./http', () => ({ request: stubs.request, http: { get: stubs.get } }))

const RESETS_AT = Date.UTC(2026, 9, 18, 3, 0, 0)
/** A first ticket of the hour: all of it to spend. */
const FULL_HOUR: VoiceBudget = { remaining_ms: MAX_CALL_MS, resets_at: RESETS_AT }
vi.mock('@elevenlabs/client', () => ({
  Conversation: { startSession: stubs.textStart },
  VoiceConversation: { startSession: stubs.voiceStart },
}))

type Start = Parameters<typeof startSession>[1]
type Callbacks = Parameters<Start>[0]

interface StubConversation {
  endSession: Mock<() => Promise<void>>
  setMicMuted: Mock<(isMuted: boolean) => void>
  getOutputVolume: Mock<() => number>
  sendUserMessage: Mock<(text: string) => void>
  sendUserActivity: Mock<() => void>
}

function stubConversation(): StubConversation {
  return {
    endSession: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    setMicMuted: vi.fn<(isMuted: boolean) => void>(),
    getOutputVolume: vi.fn<() => number>(() => 0.42),
    sendUserMessage: vi.fn<(text: string) => void>(),
    sendUserActivity: vi.fn<() => void>(),
  }
}

/**
 * Starts a session on the stub, under a budget made of the caller's signal and
 * a stand-in for `AbortSignal.timeout` the test aborts by hand, combined as `connect` combines them.
 */
function open(input: VoiceInput = 'voice', hour: VoiceBudget = FULL_HOUR) {
  const caller = new AbortController()
  const timeout = new AbortController()
  const conversation = stubConversation()
  const sdk: { callbacks?: Callbacks; resolve?: () => void; reject?: (cause: unknown) => void } = {}
  const start = vi.fn<Start>(
    (callbacks) =>
      new Promise((resolve, reject) => {
        sdk.callbacks = callbacks
        sdk.resolve = () => {
          resolve(conversation)
        }
        sdk.reject = reject
      }),
  )
  const pending = startSession(
    input,
    start,
    AbortSignal.any([caller.signal, timeout.signal]),
    caller.signal,
    hour,
  )
  const { callbacks, resolve, reject } = sdk
  if (!callbacks || !resolve || !reject) throw new Error('startSession did not call start')
  return { pending, caller, timeout, conversation, callbacks, resolve, reject }
}

/** Opens a session, lets the SDK hand the conversation over, and records every event. */
async function started(input: VoiceInput = 'voice', hour: VoiceBudget = FULL_HOUR) {
  const opened = open(input, hour)
  opened.resolve()
  const session: VoiceSession = await opened.pending
  const events: VoiceEvent[] = []
  session.subscribe((event) => {
    events.push(event)
  })
  return { ...opened, session, events }
}

const endings = (events: VoiceEvent[]) => events.filter((e) => e.type === 'ended')
const lines = (events: VoiceEvent[]) => events.filter((e) => e.type === 'message')

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('startSession, before the conversation starts', () => {
  it('rejects as unavailable when the budget runs out, and hangs up the conversation that arrives late', async () => {
    const { pending, timeout, conversation, callbacks, resolve } = open()
    timeout.abort()
    await expect(pending).rejects.toBeInstanceOf(ApiError)
    await expect(pending).rejects.toMatchObject({ code: 'voice_unavailable' })

    resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(conversation.endSession).toHaveBeenCalledTimes(1)

    // Nobody holds a session to hear them; they must not touch the conversation either.
    callbacks.onModeChange({ mode: 'speaking' })
    callbacks.onDisconnect({ reason: 'agent' })
    await vi.advanceTimersByTimeAsync(MAX_CALL_MS)
    expect(conversation.endSession).toHaveBeenCalledTimes(1)
    expect(conversation.getOutputVolume).not.toHaveBeenCalled()
  })

  it('rejects a text conversation as unavailable when the budget runs out', async () => {
    const { pending, timeout } = open('text')
    timeout.abort()
    await expect(pending).rejects.toBeInstanceOf(ApiError)
    await expect(pending).rejects.toMatchObject({ code: 'voice_unavailable' })
  })

  it('rejects as canceled, not unavailable, when the caller aborts', async () => {
    const { pending, caller } = open()
    caller.abort()
    await expect(pending).rejects.toBeInstanceOf(ApiError)
    await expect(pending).rejects.toMatchObject({ kind: 'canceled', code: null })
  })

  it('rejects as unavailable when the SDK fails to start', async () => {
    const { pending, reject } = open()
    reject(new Error('ICE negotiation failed'))
    await expect(pending).rejects.toBeInstanceOf(ApiError)
    await expect(pending).rejects.toMatchObject({ code: 'voice_unavailable' })
  })

  it('rejects as unavailable, and ends the conversation, when the SDK disconnects before handing it over', async () => {
    const { pending, callbacks, resolve, conversation } = open()
    callbacks.onDisconnect({ reason: 'error' })
    resolve()
    await expect(pending).rejects.toBeInstanceOf(ApiError)
    await expect(pending).rejects.toMatchObject({ code: 'voice_unavailable' })
    await vi.advanceTimersByTimeAsync(0)
    expect(conversation.endSession).toHaveBeenCalledTimes(1)
  })
})

describe('startSession, once the conversation has started', () => {
  it('says it is connecting until she first speaks or listens', async () => {
    const { events } = await started()
    expect(events).toEqual([{ type: 'state', state: 'connecting' }])
  })

  it('turns her mode changes into speaking and listening', async () => {
    const { events, callbacks } = await started()
    callbacks.onModeChange({ mode: 'speaking' })
    callbacks.onModeChange({ mode: 'listening' })
    expect(events.slice(1)).toEqual([
      { type: 'state', state: 'speaking' },
      { type: 'state', state: 'listening' },
    ])
  })

  it('reports her loudness only while she speaks', async () => {
    const { session, callbacks } = await started()
    expect(session.getAmplitude()).toBeNull()
    callbacks.onModeChange({ mode: 'speaking' })
    expect(session.getAmplitude()).toBe(0.42)
    callbacks.onModeChange({ mode: 'listening' })
    expect(session.getAmplitude()).toBeNull()
  })

  it('shows no transcript in a voice call', async () => {
    const { events, callbacks } = await started()
    callbacks.onMessage({ role: 'agent', message: 'Dạ, Nha khoa Minh Anh xin nghe.' })
    expect(lines(events)).toEqual([])
  })

  it('ends as the agent’s doing when the agent hangs up', async () => {
    const { events, callbacks } = await started()
    callbacks.onDisconnect({ reason: 'agent' })
    expect(endings(events)).toEqual([{ type: 'ended', reason: 'agent' }])
  })

  it('ends in error when the connection drops', async () => {
    const { events, callbacks } = await started()
    callbacks.onDisconnect({ reason: 'error' })
    expect(endings(events)).toEqual([{ type: 'ended', reason: 'error' }])
  })

  it('ends on the duration cap when the agent’s own cap fires first', async () => {
    const { events, callbacks } = await started()
    callbacks.onDisconnect({ reason: 'error', context: { type: 'max_duration_exceeded' } })
    expect(endings(events)).toEqual([{ type: 'ended', reason: 'timeout' }])
  })

  it('says how it ended once, whatever disconnects after', async () => {
    const { events, callbacks } = await started()
    callbacks.onDisconnect({ reason: 'agent' })
    const count = events.length
    callbacks.onDisconnect({ reason: 'error' })
    callbacks.onModeChange({ mode: 'speaking' })
    expect(events).toHaveLength(count)
  })

  it('hangs up on its own cap at 175 seconds', async () => {
    const { events, conversation } = await started()
    await vi.advanceTimersByTimeAsync(MAX_CALL_MS - 1)
    expect(endings(events)).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(endings(events)).toEqual([{ type: 'ended', reason: 'timeout' }])
    expect(conversation.endSession).toHaveBeenCalledTimes(1)
  })

  it('hangs up when what the ticket said is left of the hour has run, with the same ending', async () => {
    const { events, conversation } = await started('voice', { remaining_ms: 40_000, resets_at: RESETS_AT })
    await vi.advanceTimersByTimeAsync(40_000 - 1)
    expect(endings(events)).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(endings(events)).toEqual([{ type: 'ended', reason: 'timeout' }])
    expect(conversation.endSession).toHaveBeenCalledTimes(1)
  })

  it('never lets the ticket’s budget run past its own 175 seconds', async () => {
    const { events } = await started('voice', { remaining_ms: 10 * 60_000, resets_at: RESETS_AT })
    await vi.advanceTimersByTimeAsync(MAX_CALL_MS - 1)
    expect(endings(events)).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(endings(events)).toEqual([{ type: 'ended', reason: 'timeout' }])
  })

  it('holds an answer with no usable budget to its own 175 seconds, never to zero', async () => {
    const { events } = await started('voice', { remaining_ms: Number.NaN, resets_at: RESETS_AT })
    await vi.advanceTimersByTimeAsync(MAX_CALL_MS - 1)
    expect(endings(events)).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(endings(events)).toEqual([{ type: 'ended', reason: 'timeout' }])
  })

  it('says what its ticket may spend and when the hour is back', async () => {
    const hour = { remaining_ms: 40_000, resets_at: RESETS_AT }
    const { session } = await started('voice', hour)
    expect(session.budget).toEqual(hour)
  })

  it('ends once, as the visitor’s doing, when closed, and hears nothing after', async () => {
    const { session, events, conversation, callbacks } = await started()
    await session.close()
    await session.close()
    expect(endings(events)).toEqual([{ type: 'ended', reason: 'user' }])
    expect(conversation.endSession).toHaveBeenCalledTimes(1)

    const count = events.length
    callbacks.onDisconnect({ reason: 'user' })
    const late = vi.fn<(event: VoiceEvent) => void>()
    session.subscribe(late)
    expect(events).toHaveLength(count)
    expect(late).not.toHaveBeenCalled()
  })

  it('mutes the conversation when the microphone is turned off', async () => {
    const { session, conversation } = await started()
    await session.setMicEnabled(false)
    expect(conversation.setMicMuted.mock.calls).toEqual([[true]])
  })

  it('sends a typed line trimmed, and a blank one not at all', async () => {
    const { session, conversation } = await started()
    session.sendText('  ')
    session.sendText(' Giờ mở cửa? ')
    expect(conversation.sendUserMessage.mock.calls).toEqual([['Giờ mở cửa?']])
  })

  it('leaves the conversation alone once the call has ended', async () => {
    const { session, conversation, callbacks } = await started()
    callbacks.onDisconnect({ reason: 'agent' })
    await session.setMicEnabled(false)
    session.sendText('Phòng khám ở đâu?')
    expect(conversation.setMicMuted).not.toHaveBeenCalled()
    expect(conversation.sendUserMessage).not.toHaveBeenCalled()
    expect(session.getAmplitude()).toBeNull()
  })

  it.each<VoiceInput>(['voice', 'text'])(
    'tells her the visitor is typing, so she does not end a silent turn: %s',
    async (input) => {
      const { session, conversation } = await started(input)
      session.noteActivity()
      expect(conversation.sendUserActivity).toHaveBeenCalledTimes(1)
    },
  )

  it('tells her nothing about typing once closed or ended', async () => {
    const closed = await started('text')
    await closed.session.close()
    closed.session.noteActivity()
    expect(closed.conversation.sendUserActivity).not.toHaveBeenCalled()

    const hungUp = await started('text')
    hungUp.callbacks.onDisconnect({ reason: 'agent' })
    hungUp.session.noteActivity()
    expect(hungUp.conversation.sendUserActivity).not.toHaveBeenCalled()
  })
})

describe('startSession, typed', () => {
  it('waits for the visitor once connected, before her first line', async () => {
    const { events } = await started('text')
    expect(events).toEqual([{ type: 'state', state: 'listening' }])
  })

  it('keeps her first line when it arrives before the conversation is handed over', async () => {
    const { pending, callbacks, resolve } = open('text')
    callbacks.onModeChange({ mode: 'listening' })
    callbacks.onMessage({ role: 'agent', message: 'Dạ, Nha khoa Minh Anh xin nghe, em là trợ lý AI.' })
    resolve()
    const session = await pending
    const events: VoiceEvent[] = []
    session.subscribe((event) => {
      events.push(event)
    })
    expect(events).toEqual([
      { type: 'message', from: 'agent', text: 'Dạ, Nha khoa Minh Anh xin nghe, em là trợ lý AI.' },
      { type: 'state', state: 'listening' },
    ])
  })

  it('adds the visitor’s line and waits for her reply, then adds hers and waits for the visitor', async () => {
    const { session, events, conversation, callbacks } = await started('text')
    session.sendText(' Cạo vôi răng bao nhiêu? ')
    expect(events.slice(1)).toEqual([
      { type: 'message', from: 'visitor', text: 'Cạo vôi răng bao nhiêu?' },
      { type: 'state', state: 'speaking' },
    ])
    expect(conversation.sendUserMessage.mock.calls).toEqual([['Cạo vôi răng bao nhiêu?']])

    callbacks.onMessage({ role: 'user', message: 'Cạo vôi răng bao nhiêu?' })
    callbacks.onMessage({ role: 'agent', message: 'Dạ, cạo vôi răng là 300.000 đồng ạ.' })
    expect(events.slice(3)).toEqual([
      { type: 'message', from: 'agent', text: 'Dạ, cạo vôi răng là 300.000 đồng ạ.' },
      { type: 'state', state: 'listening' },
    ])
  })

  it('follows the lines, not the room’s audio, for whether she is answering', async () => {
    const { session, events, callbacks } = await started('text')
    session.sendText('Phòng khám ở đâu?')
    callbacks.onModeChange({ mode: 'listening' })
    expect(events.at(-1)).toEqual({ type: 'state', state: 'speaking' })
  })

  it('has no loudness and never touches the microphone', async () => {
    const { session, conversation, callbacks } = await started('text')
    session.sendText('9h sáng thứ Bảy còn trống không?')
    expect(session.getAmplitude()).toBeNull()
    callbacks.onMessage({ role: 'agent', message: 'Dạ còn ạ.' })
    expect(session.getAmplitude()).toBeNull()
    await session.setMicEnabled(false)
    await session.setMicEnabled(true)
    expect(conversation.setMicMuted).not.toHaveBeenCalled()
    expect(conversation.getOutputVolume).not.toHaveBeenCalled()
  })

  it('ends on the cap and when the agent hangs up, as a call does', async () => {
    const capped = await started('text')
    await vi.advanceTimersByTimeAsync(MAX_CALL_MS)
    expect(endings(capped.events)).toEqual([{ type: 'ended', reason: 'timeout' }])
    expect(capped.conversation.endSession).toHaveBeenCalledTimes(1)

    const hungUp = await started('text')
    hungUp.callbacks.onDisconnect({ reason: 'agent' })
    expect(endings(hungUp.events)).toEqual([{ type: 'ended', reason: 'agent' }])
  })
})

describe('connect', () => {
  const getUserMedia = vi.fn<(constraints: MediaStreamConstraints) => Promise<MediaStream>>()

  beforeEach(() => {
    vi.useRealTimers()
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
    stubs.request.mockResolvedValue({ token: 'conversation-token', ...FULL_HOUR })
    stubs.textStart.mockImplementation(() => Promise.resolve(stubConversation()))
    stubs.voiceStart.mockImplementation(() => Promise.resolve(stubConversation()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('starts a typed conversation on a signed URL over the WebSocket, without asking for the microphone', async () => {
    stubs.request.mockResolvedValue({ signed_url: 'wss://api.elevenlabs.io/v1/convai/conversation?signed', ...FULL_HOUR })
    const session = await voiceLive.connect({ mode: 'landing-demo', input: 'text' })
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(stubs.request).toHaveBeenCalledWith(
      '/api/voice-demo/token',
      expect.objectContaining({ method: 'POST', body: { input: 'text' }, ownOrigin: true }),
    )
    expect(stubs.voiceStart).not.toHaveBeenCalled()
    expect(stubs.textStart).toHaveBeenCalledWith(
      expect.objectContaining({
        signedUrl: 'wss://api.elevenlabs.io/v1/convai/conversation?signed',
        connectionType: 'websocket',
        textOnly: true,
      }),
    )
    // The WebRTC room joins in voice and plays her audio whatever `textOnly` says.
    expect(stubs.textStart.mock.calls[0]?.[0]).not.toHaveProperty('conversationToken')
    await session.close()
  })

  it('asks for a call’s token with the empty body it has always sent', async () => {
    getUserMedia.mockResolvedValue({ getTracks: () => [] } as unknown as MediaStream)
    const session = await voiceLive.connect({ mode: 'landing-demo', input: 'voice' })
    expect(stubs.request).toHaveBeenCalledWith('/api/voice-demo/token', {
      method: 'POST',
      body: {},
      ownOrigin: true,
      signal: expect.any(AbortSignal),
    })
    await session.close()
  })

  it('asks for the microphone first, releases it, and starts a voice conversation', async () => {
    const track = { stop: vi.fn<() => void>() }
    getUserMedia.mockResolvedValue({ getTracks: () => [track] } as unknown as MediaStream)
    const session = await voiceLive.connect({ mode: 'landing-demo', input: 'voice' })
    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(stubs.textStart).not.toHaveBeenCalled()
    expect(stubs.voiceStart).toHaveBeenCalledWith(
      expect.objectContaining({ conversationToken: 'conversation-token', connectionType: 'webrtc' }),
    )
    expect(stubs.voiceStart.mock.calls[0]?.[0]).not.toHaveProperty('textOnly')
    await session.close()
  })

  it.each([
    ['refused by the visitor', { name: 'NotAllowedError' }],
    ['refused by the page', { name: 'SecurityError' }],
    ['no microphone', { name: 'NotFoundError' }],
    ['a busy microphone', { name: 'NotReadableError' }],
  ])('rejects as microphone unavailable, minting no token: %s', async (_, cause) => {
    getUserMedia.mockRejectedValue(cause)
    const connecting = voiceLive.connect({ mode: 'landing-demo', input: 'voice' })
    await expect(connecting).rejects.toBeInstanceOf(ApiError)
    await expect(connecting).rejects.toMatchObject({ code: 'microphone_unavailable' })
    expect(stubs.request).not.toHaveBeenCalled()
  })

  it('rejects as microphone unavailable when the browser has no media API at all', async () => {
    vi.stubGlobal('navigator', {})
    const connecting = voiceLive.connect({ mode: 'landing-demo', input: 'voice' })
    await expect(connecting).rejects.toMatchObject({ code: 'microphone_unavailable' })
    expect(stubs.request).not.toHaveBeenCalled()
  })

  it('passes on the token route’s refusal, so the screen says the call could not connect', async () => {
    const refusal = new ApiError({ kind: 'server', status: 503 })
    stubs.request.mockRejectedValue(refusal)
    await expect(voiceLive.connect({ mode: 'landing-demo', input: 'text' })).rejects.toBe(refusal)
    expect(stubs.textStart).not.toHaveBeenCalled()
  })

  it('passes on a spent hour as the route said it, so the screen shows when to come back', async () => {
    getUserMedia.mockResolvedValue({ getTracks: () => [] } as unknown as MediaStream)
    const spent = new ApiError({ kind: 'ratelimited', status: 429, code: 'budget_spent' })
    stubs.request.mockRejectedValue(spent)
    const connecting = voiceLive.connect({ mode: 'landing-demo', input: 'voice' })
    await expect(connecting).rejects.toBe(spent)
    await expect(connecting).rejects.toMatchObject({ kind: 'ratelimited', code: 'budget_spent' })
    expect(stubs.voiceStart).not.toHaveBeenCalled()
  })

  it('hands the session what the ticket’s answer said of the hour', async () => {
    stubs.request.mockResolvedValue({ signed_url: 'wss://api.elevenlabs.io/v1/convai/conversation?signed', remaining_ms: 40_000, resets_at: RESETS_AT })
    const session = await voiceLive.connect({ mode: 'landing-demo', input: 'text' })
    expect(session.budget).toEqual({ remaining_ms: 40_000, resets_at: RESETS_AT })
    await session.close()
  })
})

describe('budget', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('reads the hour from this app’s own route, with the caller’s signal', async () => {
    const hour = { remaining_ms: 135_000, resets_at: RESETS_AT }
    stubs.get.mockResolvedValue(hour)
    const controller = new AbortController()
    await expect(voiceLive.budget({ signal: controller.signal })).resolves.toEqual(hour)
    expect(stubs.get).toHaveBeenCalledWith('/api/voice-demo/budget', { ownOrigin: true, signal: controller.signal })
  })
})
