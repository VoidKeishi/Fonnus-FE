import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { VoiceEvent } from './contracts'
import { scriptedVoiceSession, speechLevel } from './voice-scripted'
import type { ScriptedPlayer } from './voice-scripted'

/*
 * The scripted session is what every visitor hears until a live receptionist
 * answers, and what they fall back to when one cannot. Its script decides the
 * one line under the orb — "đang nói" or "đang nghe" — so a timing that drifts
 * reads as Linh talking over the caller or freezing mid-sentence.
 */

interface StubPlayer extends ScriptedPlayer {
  end: () => void
  stop: Mock<() => void>
  dispose: Mock<() => void>
}

function stubPlayer(started: boolean, amplitude: number | null = null): (onEnded: () => void) => StubPlayer {
  return (onEnded) => ({
    play: () => Promise.resolve(started),
    stop: vi.fn<() => void>(),
    dispose: vi.fn<() => void>(),
    getAmplitude: () => amplitude,
    end: onEnded,
  })
}

/** Opens a session on the stub and records every event it delivers. */
function open(started: boolean, amplitude: number | null = null) {
  const built: { player?: StubPlayer } = {}
  const make = stubPlayer(started, amplitude)
  const session = scriptedVoiceSession({
    createPlayer: (onEnded) => {
      built.player = make(onEnded)
      return built.player
    },
  })
  const events: VoiceEvent[] = []
  session.subscribe((event) => {
    events.push(event)
  })
  if (!built.player) throw new Error('the session built no player')
  return { session, events, player: built.player }
}

const states = (events: VoiceEvent[]) => events.map((e) => (e.type === 'state' ? e.state : e.type))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('scriptedVoiceSession', () => {
  it('is speaking from the moment it opens, and listens once the greeting ends', async () => {
    const { events, player } = open(true)
    expect(states(events)).toEqual(['speaking'])
    await vi.advanceTimersByTimeAsync(0)
    player.end()
    expect(states(events)).toEqual(['speaking', 'listening'])
  })

  it('connects, then speaks a scripted beat, when the greeting will not play', async () => {
    const { events } = open(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(states(events)).toEqual(['speaking', 'connecting'])
    await vi.advanceTimersByTimeAsync(1600)
    expect(states(events)).toEqual(['speaking', 'connecting', 'speaking'])
    await vi.advanceTimersByTimeAsync(5199)
    expect(states(events).at(-1)).toBe('speaking')
    await vi.advanceTimersByTimeAsync(1)
    expect(states(events)).toEqual(['speaking', 'connecting', 'speaking', 'listening'])
  })

  it('cuts the greeting off to answer a question for 4.4 seconds', async () => {
    const { session, events, player } = open(true)
    await vi.advanceTimersByTimeAsync(0)
    session.sendText('Cạo vôi răng bao nhiêu?')
    expect(player.stop).toHaveBeenCalled()
    expect(states(events)).toEqual(['speaking', 'speaking'])
    await vi.advanceTimersByTimeAsync(4399)
    expect(states(events).at(-1)).toBe('speaking')
    await vi.advanceTimersByTimeAsync(1)
    expect(states(events).at(-1)).toBe('listening')
  })

  it('ignores a blank line', () => {
    const { session, events, player } = open(true)
    session.sendText('   ')
    expect(player.stop).not.toHaveBeenCalled()
    expect(states(events)).toEqual(['speaking'])
  })

  it('ends once, as the visitor’s doing, and says nothing after closing', async () => {
    const { session, events, player } = open(false)
    await session.close()
    await session.close()
    expect(events.filter((e) => e.type === 'ended')).toEqual([{ type: 'ended', reason: 'user' }])
    expect(player.dispose).toHaveBeenCalledTimes(1)

    const count = events.length
    session.sendText('Phòng khám ở đâu?')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(events).toHaveLength(count)
  })

  it('reports the player’s loudness for the orb', () => {
    expect(open(true, 0.42).session.getAmplitude()).toBe(0.42)
    expect(open(true, null).session.getAmplitude()).toBeNull()
  })
})

describe('speechLevel', () => {
  it('is silent for a flat signal', () => {
    expect(speechLevel(new Uint8Array(512).fill(128))).toBe(0)
  })

  it('scales quiet speech up by 3.2', () => {
    // ±16 around the centre is an RMS of 0.125.
    const quiet = Uint8Array.from({ length: 512 }, (_, i) => (i % 2 ? 144 : 112))
    expect(speechLevel(quiet)).toBeCloseTo(0.4)
  })

  it('never passes 1 however loud the voice', () => {
    const loud = Uint8Array.from({ length: 512 }, (_, i) => (i % 2 ? 255 : 0))
    expect(speechLevel(loud)).toBe(1)
  })

  it('is silent for an empty frame', () => {
    expect(speechLevel(new Uint8Array(0))).toBe(0)
  })
})
