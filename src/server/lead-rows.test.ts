import { describe, expect, it } from 'vitest'
import { leadRow, vietnamTimestamp } from './lead-rows'

/*
 * The team reads the sheet in Vietnam, and a server runs in UTC: a request
 * sent in the evening lands on the next day's date unless the row is written
 * in Vietnam time. The phone must reach the sheet as text, or its leading 0
 * is gone.
 */

describe('vietnamTimestamp', () => {
  it('writes an evening request in Vietnam on the next day', () => {
    expect(vietnamTimestamp(new Date('2026-09-30T18:30:05Z'))).toBe('2026-10-01 01:30:05')
  })

  it('pads every part to two digits', () => {
    expect(vietnamTimestamp(new Date('2026-01-04T01:02:03Z'))).toBe('2026-01-04 08:02:03')
  })
})

describe('leadRow', () => {
  it('lays out one contact request in the tab order, the phone kept as text', () => {
    const row = leadRow(
      { clinic_name: 'Nha khoa Minh Anh', contact_name: 'Nguyễn Minh Anh', phone: '0901234567' },
      new Date('2026-12-31T17:00:00Z'),
    )
    expect(row).toEqual(['2027-01-01 00:00:00', 'Nha khoa Minh Anh', 'Nguyễn Minh Anh', '0901234567', 'landing_contact'])
  })
})
