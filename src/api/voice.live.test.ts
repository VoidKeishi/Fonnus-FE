import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { VoiceEvent, VoiceSession } from './contracts'
import { ApiError } from './errors'
import { MAX_CALL_MS, isRefusal, startSession } from './voice.live'

/*
 * The live session decides two things the visitor feels at once. Before the
 * conversation starts, every failure must reject, so the call carries on with
 * Linh's recording instead of a dead screen — and a conversation that turns up
 * after that must be hung up, or she answers in the background of a recording.
 * After it starts, the SDK's disconnect has to become the one ending the screen
 * shows, said once and with the right reason. None of it needs a microphone:
 * the SDK's `startSession` is stubbed and its callbacks are called by hand.
 */

type Start = Parameters<typeof startSession>[0]
type Callbacks = Parameters<Start>[0]

interface StubConversation {
  endSession: Mock<() => Promise<void>>
  setMicMuted: Mock<(isMuted: boolean) => void>
  getOutputVolume: Mock<() => number>
  sendUserMessage: Mock<(text: string) => void>
}

function stubConversation(): StubConversation {
  return {
    endSession: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    setMicMuted: vi.fn<(isMuted: boolean) => void>(),
    getOutputVolume: vi.fn<() => number>(() => 0.42),
    sendUserMessage: vi.fn<(text: string) => void>(),
  }
}

/**
 * Starts a session on the stub, under a budget made of the caller's signal and
 * a stand-in for `AbortSignal.timeout` the test aborts by hand, combined as `connect` combines them.
 */
function open() {
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
  const pending = startSession(start, AbortSignal.any([caller.signal, timeout.signal]), caller.signal)
  const { callbacks, resolve, reject } = sdk
  if (!callbacks || !resolve || !reject) throw new Error('startSession did not call start')
  return { pending, caller, timeout, conversation, callbacks, resolve, reject }
}

/** Opens a session, lets the SDK hand the conversation over, and records every event. */
async function started() {
  const opened = open()
  opened.resolve()
  const session: VoiceSession = await opened.pending
  const events: VoiceEvent[] = []
  session.subscribe((event) => {
    events.push(event)
  })
  return { ...opened, session, events }
}

const endings = (events: VoiceEvent[]) => events.filter((e) => e.type === 'ended')

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
})

describe('isRefusal', () => {
  it.each([{ name: 'NotAllowedError' }, { name: 'SecurityError' }])('is a refusal: $name', (cause) => {
    expect(isRefusal(cause)).toBe(true)
  })

  it.each([
    ['no microphone', { name: 'NotFoundError' }],
    ['a busy microphone', { name: 'NotReadableError' }],
    ['a TypeError', new TypeError('getUserMedia is not a function')],
    ['undefined', undefined],
    ['null', null],
  ])('is not a refusal: %s', (_, cause) => {
    expect(isRefusal(cause)).toBe(false)
  })
})
