import { describe, expect, it } from 'vitest'
import { BOOKING_DEMO, FAQ_DEMO, HANDOFF_DEMO } from '@/data/call-demos'
import {
  actionReached,
  elapsedOnRecording,
  elapsedSince,
  formatClock,
  isBarPlayed,
  isFinished,
  progressAt,
  turnsHeard,
} from './call-demo-timeline'

/*
 * A sample call is a script played against its recording, and everything the
 * owner sees — which lines are up, whether the booking card is showing, the
 * clock — is read off one number. Getting a boundary wrong shows a reply before
 * Linh says it, or a card before the call has reached it.
 */

// The moments were set by ear against each recording; a tick early is Linh
// answering before she speaks, or the card before the call reaches it.
const MOMENTS = [
  { name: 'booking', demo: BOOKING_DEMO, linhAt: 3.6, cardAt: 7.5, before: { linh: 3.5, card: 7.4 } },
  { name: 'price question', demo: FAQ_DEMO, linhAt: 3.6, cardAt: 8.4, before: { linh: 3.5, card: 8.3 } },
  { name: 'handoff', demo: HANDOFF_DEMO, linhAt: 4.5, cardAt: 8.4, before: { linh: 4.4, card: 8.3 } },
]

describe('turnsHeard', () => {
  it('shows nothing before the first line, so the hint stays up', () => {
    expect(turnsHeard(BOOKING_DEMO, 0)).toEqual([])
  })

  it.each(MOMENTS)('brings each $name line in at its own second, in call order', ({ demo, linhAt, before }) => {
    expect(turnsHeard(demo, 0.5).map((t) => t.role)).toEqual(['caller'])
    expect(turnsHeard(demo, before.linh).map((t) => t.role)).toEqual(['caller'])
    expect(turnsHeard(demo, linhAt).map((t) => t.role)).toEqual(['caller', 'linh'])
  })
})

describe('actionReached', () => {
  it.each(MOMENTS)('shows the $name card at its moment and not a tick before', ({ demo, cardAt, before }) => {
    expect(actionReached(demo, before.card)).toBe(false)
    expect(actionReached(demo, cardAt)).toBe(true)
  })
})

describe('the clock', () => {
  it('resumes from where the call was paused', () => {
    expect(elapsedSince(BOOKING_DEMO, 3.2, 1000, 3000)).toBeCloseTo(5.2)
  })

  it('stops at the end of the call however long the tab was away', () => {
    expect(elapsedSince(BOOKING_DEMO, 8, 0, 60_000)).toBe(10.19)
    expect(isFinished(BOOKING_DEMO, 10.19)).toBe(true)
    expect(isFinished(BOOKING_DEMO, 10.1)).toBe(false)
  })

  it('follows the recording while it plays, holding still while it buffers', () => {
    expect(elapsedOnRecording(BOOKING_DEMO, 3.6, false)).toBe(3.6)
    expect(elapsedOnRecording(BOOKING_DEMO, 0, false)).toBe(0)
  })

  it('finishes the call when the recording ends, however close to its length the last frame lands', () => {
    expect(isFinished(BOOKING_DEMO, elapsedOnRecording(BOOKING_DEMO, 10.18, true))).toBe(true)
    expect(elapsedOnRecording(BOOKING_DEMO, 10.2, false)).toBe(10.19)
  })

  it('ends on the length of each recording, read as the player shows it', () => {
    expect(formatClock(BOOKING_DEMO.duration)).toBe('0:10')
    expect(formatClock(FAQ_DEMO.duration)).toBe('0:10')
    expect(formatClock(HANDOFF_DEMO.duration)).toBe('0:09')
  })

  it('reads whole seconds as 0:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(7.9)).toBe('0:07')
  })

  it('carries seconds past a minute into m:ss with the seconds padded', () => {
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(75.9)).toBe('1:15')
  })
})

describe('progress', () => {
  it('fills the bar in proportion and never past either end', () => {
    expect(progressAt(BOOKING_DEMO, BOOKING_DEMO.duration / 2)).toBe(0.5)
    expect(progressAt(BOOKING_DEMO, 12)).toBe(1)
    expect(progressAt(BOOKING_DEMO, -1)).toBe(0)
  })

  it('colours the bars behind the playhead as played', () => {
    expect(isBarPlayed(11, 24, 0.5)).toBe(true)
    expect(isBarPlayed(13, 24, 0.5)).toBe(false)
  })
})
