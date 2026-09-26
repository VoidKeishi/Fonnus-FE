import { describe, expect, it } from 'vitest'
import { bracketSpan, placeTip, slotAt } from './chart-geometry'

/*
 * The missed-calls chart is read with a finger on a 375px phone. A column that
 * the pointer cannot reach, or a tip that slides off the card, is the chart
 * failing at the one width its readers mostly have.
 */

describe('slotAt', () => {
  it('picks the column under the pointer, anywhere in its slot', () => {
    expect(slotAt(10, 0, 600, 6)).toBe(0)
    expect(slotAt(250, 0, 600, 6)).toBe(2)
    expect(slotAt(599, 0, 600, 6)).toBe(5)
  })

  it('holds to the first and last column past the track edges', () => {
    expect(slotAt(-40, 0, 600, 6)).toBe(0)
    expect(slotAt(700, 0, 600, 6)).toBe(5)
  })
})

describe('bracketSpan', () => {
  it('spans the working-day columns, inset at both ends, with the label centred under them', () => {
    expect(bracketSpan(1, 2, 4)).toEqual({ left: 'calc(25% + 10px)', width: 'calc(50% - 20px)', labelLeft: '50%' })
    expect(bracketSpan(0, 2, 4)).toEqual({ left: 'calc(0% + 10px)', width: 'calc(75% - 20px)', labelLeft: '37.5%' })
  })
})

describe('placeTip', () => {
  const host = { left: 100, top: 400, width: 300, bottom: 640 }
  const tip = { width: 160, height: 60 }

  it('centres the tip over the mark, above it', () => {
    expect(placeTip(host, { left: 220, top: 500, width: 60, bottom: 640 }, tip)).toEqual({
      x: 70,
      y: 30,
      caret: 80,
      below: false,
    })
  })

  it('clamps the tip to the chart at the edge and keeps the caret on the mark', () => {
    const placed = placeTip(host, { left: 100, top: 500, width: 40, bottom: 640 }, tip)
    expect(placed.x).toBe(-6)
    expect(placed.caret).toBe(26)
  })

  it('hangs the tip below a mark too close to the top of the screen', () => {
    const nearTop = { left: 0, top: 10, width: 300, bottom: 250 }
    expect(placeTip(nearTop, { left: 120, top: 40, width: 60, bottom: 250 }, tip)).toMatchObject({ below: true, y: 250 })
  })
})
