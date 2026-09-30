import { describe, expect, it } from 'vitest'
import { hotlineRows, leadRow, vietnamTimestamp } from './lead-rows'

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

describe('hotlineRows', () => {
  it('gives each location its own row, numbered from 1, tied together by time and request id', () => {
    const rows = hotlineRows(
      {
        contact_name: 'Nguyễn Minh Anh',
        email: 'anh@nhakhoaminhanh.vn',
        clinic_name: 'Nha khoa Minh Anh',
        locations: [
          { address: '12 Nguyễn Trãi, Quận 1, TP.HCM', phone: '02838221234' },
          { address: '45 Lê Lợi, Quận 3, TP.HCM', phone: '0901234567' },
        ],
      },
      new Date('2026-09-30T18:30:05Z'),
      '3f1c9a52-7d0e-4b8a-9c61-2e5f8b4d7a10',
    )
    const shared = ['2026-10-01 01:30:05', '3f1c9a52-7d0e-4b8a-9c61-2e5f8b4d7a10', 'Nguyễn Minh Anh', 'anh@nhakhoaminhanh.vn', 'Nha khoa Minh Anh']
    expect(rows).toEqual([
      [...shared, '1', '12 Nguyễn Trãi, Quận 1, TP.HCM', '02838221234'],
      [...shared, '2', '45 Lê Lợi, Quận 3, TP.HCM', '0901234567'],
    ])
  })
})
