import { describe, expect, it } from 'vitest'
import { MAX_NAME_LENGTH, parseLead } from './leads-input'

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
