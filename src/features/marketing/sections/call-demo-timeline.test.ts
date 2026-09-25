import { describe, expect, it } from 'vitest'
import { BOOKING_DEMO, HANDOFF_DEMO } from '@/data/call-demos'
import {
  actionReached,
  elapsedSince,
  formatClock,
  isBarPlayed,
  isFinished,
  progressAt,
  turnsHeard,
} from './call-demo-timeline'

/*
 * A sample call is a script played against a clock, and everything the owner
 * sees — which lines are up, whether the booking card is showing, the clock —
 * is read off one number. Getting a boundary wrong shows a reply before the
 * question, or a card before the call has reached it.
 */

describe('turnsHeard', () => {
  it('shows nothing before the first line, so the hint stays up', () => {
    expect(turnsHeard(BOOKING_DEMO, 0)).toEqual([])
  })

  it('brings each line in at its own second, in call order', () => {
    expect(turnsHeard(BOOKING_DEMO, 0.5).map((t) => t.role)).toEqual(['caller'])
    expect(turnsHeard(BOOKING_DEMO, 3.9).map((t) => t.role)).toEqual(['caller'])
    expect(turnsHeard(BOOKING_DEMO, 4).map((t) => t.role)).toEqual(['caller', 'linh'])
  })
})

describe('actionReached', () => {
  it('shows the booking card at its moment and not a tick before', () => {
    expect(actionReached(BOOKING_DEMO, 7.3)).toBe(false)
    expect(actionReached(BOOKING_DEMO, 7.4)).toBe(true)
  })
})

describe('the clock', () => {
  it('resumes from where the call was paused', () => {
    expect(elapsedSince(BOOKING_DEMO, 3.2, 1000, 3000)).toBeCloseTo(5.2)
  })

  it('stops at the end of the call however long the tab was away', () => {
    expect(elapsedSince(BOOKING_DEMO, 8, 0, 60_000)).toBe(9)
    expect(isFinished(BOOKING_DEMO, 9)).toBe(true)
    expect(isFinished(BOOKING_DEMO, 8.9)).toBe(false)
  })

  it('reads whole seconds as 0:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(7.9)).toBe('0:07')
    expect(formatClock(HANDOFF_DEMO.duration)).toBe('0:10')
  })

  it('carries seconds past a minute into m:ss with the seconds padded', () => {
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(75.9)).toBe('1:15')
  })
})

describe('progress', () => {
  it('fills the bar in proportion and never past either end', () => {
    expect(progressAt(BOOKING_DEMO, 4.5)).toBe(0.5)
    expect(progressAt(BOOKING_DEMO, 12)).toBe(1)
    expect(progressAt(BOOKING_DEMO, -1)).toBe(0)
  })

  it('colours the bars behind the playhead as played', () => {
    expect(isBarPlayed(11, 24, 0.5)).toBe(true)
    expect(isBarPlayed(13, 24, 0.5)).toBe(false)
  })
})
