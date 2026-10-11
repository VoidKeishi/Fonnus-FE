import { describe, expect, it, vi } from 'vitest'
import { createVoiceEvents } from './voice-events'

/*
 * Both voice sessions, the scripted one and the live one, speak through this
 * stream. A listener that misses the event emitted before it subscribed leaves
 * the line under the orb on "Đang kết nối…" through the whole greeting, and a
 * listener still called after close drives a call screen that is already gone.
 */

describe('createVoiceEvents', () => {
  it('hands a new listener the initial event before anything is emitted', () => {
    const events = createVoiceEvents('connecting')
    const listener = vi.fn<(event: string) => void>()
    events.subscribe(listener)
    expect(listener.mock.calls).toEqual([['connecting']])
  })

  it('hands a late listener the last event emitted, and only that one', () => {
    const events = createVoiceEvents('connecting')
    events.emit('speaking')
    events.emit('listening')
    const listener = vi.fn<(event: string) => void>()
    events.subscribe(listener)
    expect(listener.mock.calls).toEqual([['listening']])
  })

  it('delivers each event to every listener, in the order they subscribed', () => {
    const events = createVoiceEvents('connecting')
    const heard: string[] = []
    events.subscribe((event) => heard.push(`first:${event}`))
    events.subscribe((event) => heard.push(`second:${event}`))
    heard.length = 0
    events.emit('speaking')
    expect(heard).toEqual(['first:speaking', 'second:speaking'])
  })

  it('keeps delivering to the others when a listener unsubscribes while being called', () => {
    const events = createVoiceEvents('connecting')
    const heard: string[] = []
    const unsubscribeFirst = events.subscribe((event) => {
      heard.push(`first:${event}`)
      if (event === 'speaking') unsubscribeFirst()
    })
    events.subscribe((event) => heard.push(`second:${event}`))
    heard.length = 0
    events.emit('speaking')
    events.emit('listening')
    expect(heard).toEqual(['first:speaking', 'second:speaking', 'second:listening'])
  })

  it('stops delivering to a listener that unsubscribed, and only to that one', () => {
    const events = createVoiceEvents('connecting')
    const kept = vi.fn<(event: string) => void>()
    const dropped = vi.fn<(event: string) => void>()
    events.subscribe(kept)
    const unsubscribe = events.subscribe(dropped)
    unsubscribe()
    events.emit('speaking')
    expect(kept.mock.calls).toEqual([['connecting'], ['speaking']])
    expect(dropped.mock.calls).toEqual([['connecting']])
  })

  it('delivers nothing once closed, to old listeners or new ones, and closing twice is harmless', () => {
    const events = createVoiceEvents('connecting')
    const before = vi.fn<(event: string) => void>()
    events.subscribe(before)
    events.close()
    events.close()
    expect(events.isClosed()).toBe(true)

    events.emit('speaking')
    const after = vi.fn<(event: string) => void>()
    const unsubscribe = events.subscribe(after)
    expect(() => {
      unsubscribe()
    }).not.toThrow()
    expect(before.mock.calls).toEqual([['connecting']])
    expect(after).not.toHaveBeenCalled()
  })

  it('is open until closed', () => {
    expect(createVoiceEvents('connecting').isClosed()).toBe(false)
  })
})
