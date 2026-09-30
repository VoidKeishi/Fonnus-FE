import { describe, expect, it } from 'vitest'
import { MAX_LOCATIONS, MAX_NAME_LENGTH, parseHotlineReport, parseLead } from './leads-input'

/*
 * The server's copy of the contact form's rules is the only thing between a
 * request anyone can send and the sheet the team rings people from. It has to
 * agree with the form on every number a clinic can leave, and refuse what the
 * form would never have sent.
 */

const VALID = { clinic_name: 'Nha khoa Minh Anh', contact_name: 'Nguyễn Minh Anh', phone: '0901234567' }

function errorsOf(body: unknown) {
  const result = parseLead(body)
  return result.ok ? [] : result.errors
}

describe('parseLead', () => {
  it('trims the names and writes the number in national digits', () => {
    expect(
      parseLead({ clinic_name: ' Nha khoa Minh Anh ', contact_name: 'Nguyễn Minh Anh', phone: '+84 90 123 45 67' }),
    ).toEqual({ ok: true, lead: { clinic_name: 'Nha khoa Minh Anh', contact_name: 'Nguyễn Minh Anh', phone: '0901234567' } })
  })

  it('keeps a 1900 hotline without a leading zero', () => {
    const result = parseLead({ ...VALID, phone: '1900 1234' })
    expect(result.ok && result.lead.phone).toBe('19001234')
  })

  it('ignores the source the form sends and any extra key', () => {
    const result = parseLead({ ...VALID, source: 'landing_contact', note: 'gọi buổi chiều' })
    expect(result).toEqual({ ok: true, lead: VALID })
  })

  it.each([
    ['missing', {}],
    ['blank', { clinic_name: '   ', contact_name: '', phone: ' ' }],
    ['not a string', { clinic_name: 42, contact_name: ['Anh'], phone: 901234567 }],
  ])('asks for every field that is %s, in form order', (_, body) => {
    expect(errorsOf(body)).toEqual([
      { field: 'clinic_name', code: 'required' },
      { field: 'contact_name', code: 'required' },
      { field: 'phone', code: 'required' },
    ])
  })

  it('refuses a number nobody can be rung back on', () => {
    expect(errorsOf({ ...VALID, phone: '0123456789' })).toEqual([{ field: 'phone', code: 'invalid_phone' }])
  })

  it('refuses a name longer than the form allows', () => {
    const name = 'Nha khoa Minh Anh '.repeat(12).slice(0, MAX_NAME_LENGTH + 1)
    expect(name).toHaveLength(201)
    expect(errorsOf({ ...VALID, contact_name: name })).toEqual([{ field: 'contact_name', code: 'too_long' }])
  })

  it('accepts a name of exactly the limit', () => {
    expect(parseLead({ ...VALID, clinic_name: 'A'.repeat(MAX_NAME_LENGTH) }).ok).toBe(true)
  })

  it.each([
    ['null', null],
    ['an array', [VALID]],
    ['a string', JSON.stringify(VALID)],
  ])('refuses %s as a body', (_, body) => {
    expect(errorsOf(body).map(({ field }) => field)).toEqual(['clinic_name', 'contact_name', 'phone'])
  })
})

/*
 * The hotline report is the larger body: a chain sends up to twenty sites,
 * and a refusal has to land on the right row of the form, so the paths and
 * their order are what matter.
 */

const REPORT = {
  contact_name: 'Nguyễn Minh Anh',
  email: 'anh@nhakhoaminhanh.vn',
  clinic_name: 'Nha khoa Minh Anh',
  locations: [
    { address: '12 Nguyễn Trãi, Quận 1, TP.HCM', phone: '02838221234' },
    { address: '45 Lê Lợi, Quận 3, TP.HCM', phone: '19001234' },
  ],
  source: 'hotline_report',
}

function reportErrorsOf(body: unknown) {
  const result = parseHotlineReport(body)
  return result.ok ? [] : result.errors
}

function sites(count: number) {
  return Array.from({ length: count }, (_, i) => ({ address: `${String(i + 1)} Hai Bà Trưng, Quận 1, TP.HCM`, phone: '0901234567' }))
}

describe('parseHotlineReport', () => {
  it('accepts the example request, text trimmed and numbers in national digits', () => {
    const result = parseHotlineReport({
      ...REPORT,
      contact_name: ' Nguyễn Minh Anh ',
      email: ' anh@nhakhoaminhanh.vn ',
      locations: [
        { address: ' 12 Nguyễn Trãi, Quận 1, TP.HCM ', phone: '+84 28 3822 1234' },
        { address: '45 Lê Lợi, Quận 3, TP.HCM', phone: '1900 1234' },
      ],
    })
    expect(result).toEqual({
      ok: true,
      report: {
        contact_name: 'Nguyễn Minh Anh',
        email: 'anh@nhakhoaminhanh.vn',
        clinic_name: 'Nha khoa Minh Anh',
        locations: [
          { address: '12 Nguyễn Trãi, Quận 1, TP.HCM', phone: '02838221234' },
          { address: '45 Lê Lợi, Quận 3, TP.HCM', phone: '19001234' },
        ],
      },
    })
  })

  it('names the second location’s blank address and bad number after the person’s fields', () => {
    const [first] = REPORT.locations
    expect(
      reportErrorsOf({ ...REPORT, contact_name: '', locations: [first, { address: '  ', phone: '0123456789' }] }),
    ).toEqual([
      { field: 'contact_name', code: 'required' },
      { field: 'locations.1.address', code: 'required' },
      { field: 'locations.1.phone', code: 'invalid_phone' },
    ])
  })

  it('treats a location that is not an object as missing both parts', () => {
    expect(reportErrorsOf({ ...REPORT, locations: ['02838221234'] })).toEqual([
      { field: 'locations.0.address', code: 'required' },
      { field: 'locations.0.phone', code: 'required' },
    ])
  })

  it.each([
    ['no locations', []],
    ['a list that is not an array', { address: '12 Nguyễn Trãi', phone: '02838221234' }],
  ])('asks for locations when there are %s', (_, locations) => {
    expect(reportErrorsOf({ ...REPORT, locations })).toEqual([{ field: 'locations', code: 'required' }])
  })

  it('refuses more locations than the form allows, without checking each one', () => {
    const tooMany = [...sites(MAX_LOCATIONS), { address: '', phone: '' }]
    expect(tooMany).toHaveLength(21)
    expect(reportErrorsOf({ ...REPORT, locations: tooMany })).toEqual([{ field: 'locations', code: 'too_long' }])
  })

  it('accepts exactly twenty locations', () => {
    const result = parseHotlineReport({ ...REPORT, locations: sites(20) })
    expect(result.ok && result.report.locations).toHaveLength(20)
  })

  it('refuses an email with no top-level domain', () => {
    expect(reportErrorsOf({ ...REPORT, email: 'anh@nhakhoa' })).toEqual([{ field: 'email', code: 'invalid_email' }])
  })

  it('refuses a 255-character email and a 501-character address', () => {
    const email = `${'a'.repeat(255 - '@nhakhoaminhanh.vn'.length)}@nhakhoaminhanh.vn`
    const address = '12 Nguyễn Trãi, Quận 1, TP.HCM'.padEnd(501, '.')
    expect([email.length, address.length]).toEqual([255, 501])
    expect(reportErrorsOf({ ...REPORT, email, locations: [{ address, phone: '02838221234' }] })).toEqual([
      { field: 'email', code: 'too_long' },
      { field: 'locations.0.address', code: 'too_long' },
    ])
  })

  it('accepts an email and an address of exactly the limit', () => {
    const email = `${'a'.repeat(254 - '@nhakhoaminhanh.vn'.length)}@nhakhoaminhanh.vn`
    const address = '12 Nguyễn Trãi, Quận 1, TP.HCM'.padEnd(500, '.')
    expect([email.length, address.length]).toEqual([254, 500])
    expect(reportErrorsOf({ ...REPORT, email, locations: [{ address, phone: '02838221234' }] })).toEqual([])
  })

  it('refuses a contact or clinic name longer than the form allows', () => {
    const name = 'Nha khoa Minh Anh'.padEnd(MAX_NAME_LENGTH + 1, '.')
    expect(name).toHaveLength(201)
    expect(reportErrorsOf({ ...REPORT, contact_name: name, clinic_name: name })).toEqual([
      { field: 'contact_name', code: 'too_long' },
      { field: 'clinic_name', code: 'too_long' },
    ])
  })

  it('treats a location part that is not a string as missing', () => {
    expect(
      reportErrorsOf({
        ...REPORT,
        locations: [
          { address: '12 Nguyễn Trãi, Quận 1, TP.HCM', phone: 2838221234 },
          { address: ['45 Lê Lợi'], phone: '19001234' },
        ],
      }),
    ).toEqual([
      { field: 'locations.0.phone', code: 'required' },
      { field: 'locations.1.address', code: 'required' },
    ])
  })

  it('lists problems location by location, the first site before the second', () => {
    expect(
      reportErrorsOf({
        ...REPORT,
        locations: [
          { address: '12 Nguyễn Trãi, Quận 1, TP.HCM', phone: '12345' },
          { address: '', phone: '19001234' },
        ],
      }),
    ).toEqual([
      { field: 'locations.0.phone', code: 'invalid_phone' },
      { field: 'locations.1.address', code: 'required' },
    ])
  })

  it('refuses a body that is not an object, one field at a time', () => {
    expect(reportErrorsOf(null)).toEqual([
      { field: 'contact_name', code: 'required' },
      { field: 'email', code: 'required' },
      { field: 'clinic_name', code: 'required' },
      { field: 'locations', code: 'required' },
    ])
  })
})
