import { describe, expect, it } from 'vitest'
import { ApiError, messageFor } from '@/api'
import { fieldErrorsFrom, firstInvalid, leadFrom, sendErrorFrom, validateLead, withoutError } from './lead-fields'

/*
 * The contact form is where a visitor leaves the number we promise to ring
 * back. A line under the wrong field, an English fallback, or a server refusal
 * that lands nowhere all end the same way: nobody is called.
 */

const FILLED = { clinic_name: 'Nha khoa Minh Anh', contact_name: 'Nguyễn Minh Anh', phone: '090 123 45 67' }

describe('validateLead', () => {
  it('asks for all three fields when the form is sent empty', () => {
    expect(validateLead({ clinic_name: '', contact_name: '', phone: '' })).toEqual({
      clinic_name: 'Nhập tên phòng khám.',
      contact_name: 'Nhập tên của bạn.',
      phone: 'Nhập số điện thoại để chúng tôi gọi lại.',
    })
  })

  it('treats a field of spaces as empty', () => {
    expect(validateLead({ clinic_name: '   ', contact_name: ' ', phone: '  ' })).toEqual({
      clinic_name: 'Nhập tên phòng khám.',
      contact_name: 'Nhập tên của bạn.',
      phone: 'Nhập số điện thoại để chúng tôi gọi lại.',
    })
  })

  it('says a number that cannot be rung back is not right, with an example', () => {
    expect(validateLead({ ...FILLED, phone: '0123456789' })).toEqual({
      phone: 'Số này chưa đúng. VD: 090 123 45 67',
    })
  })

  it('finds nothing wrong with a filled form', () => {
    expect(validateLead(FILLED)).toEqual({})
  })
})

describe('fieldErrorsFrom', () => {
  const refused = (field: string, code: string) =>
    new ApiError({ kind: 'validation', status: 422, code: 'validation_failed', fields: [{ field, code }] })

  it('puts a refused name back under its field as the missing line', () => {
    expect(fieldErrorsFrom(refused('clinic_name', 'required'))).toEqual({ clinic_name: 'Nhập tên phòng khám.' })
    expect(fieldErrorsFrom(refused('contact_name', 'too_long'))).toEqual({ contact_name: 'Nhập tên của bạn.' })
  })

  it('tells a missing number from a wrong one', () => {
    expect(fieldErrorsFrom(refused('phone', 'required'))).toEqual({
      phone: 'Nhập số điện thoại để chúng tôi gọi lại.',
    })
    expect(fieldErrorsFrom(refused('phone', 'invalid_phone'))).toEqual({
      phone: 'Số này chưa đúng. VD: 090 123 45 67',
    })
  })

  it('ignores a field the form does not have', () => {
    expect(fieldErrorsFrom(refused('source', 'invalid'))).toEqual({})
  })

  it('has nothing to place for an error that is not a refusal of the fields', () => {
    expect(fieldErrorsFrom(new ApiError({ kind: 'ratelimited', status: 429 }))).toEqual({})
    expect(fieldErrorsFrom(new ApiError({ kind: 'server', status: 500 }))).toEqual({})
  })
})

describe('firstInvalid', () => {
  it('picks the field highest on the form, whatever order the errors came in', () => {
    expect(firstInvalid({ phone: 'x', contact_name: 'y' })).toBe('contact_name')
    expect(firstInvalid({})).toBeUndefined()
  })
})

describe('leadFrom', () => {
  it('sends trimmed names and the number in national digits', () => {
    expect(leadFrom({ clinic_name: ' Nha khoa Minh Anh ', contact_name: 'Nguyễn Minh Anh ', phone: '1900 1234' })).toEqual({
      clinic_name: 'Nha khoa Minh Anh',
      contact_name: 'Nguyễn Minh Anh',
      phone: '19001234',
    })
  })
})

describe('withoutError', () => {
  it('clears only the line of the field being edited', () => {
    expect(withoutError({ clinic_name: 'a', phone: 'b' }, 'phone')).toEqual({ clinic_name: 'a' })
  })
})

describe('sendErrorFrom', () => {
  it('reads a refusal that named no field of this form as the plain failure', () => {
    const stray = new ApiError({
      kind: 'validation',
      status: 422,
      code: 'validation_failed',
      fields: [{ field: 'source', code: 'required' }],
    })
    expect(sendErrorFrom(stray)).toBe(messageFor(null))
    expect(sendErrorFrom(stray)).not.toBe(messageFor(stray))
  })

  it('keeps the sentence of a validation code that has one', () => {
    const coded = new ApiError({ kind: 'validation', status: 422, code: 'invalid_phone' })
    expect(sendErrorFrom(coded)).toBe(messageFor(coded))
    expect(sendErrorFrom(coded)).not.toBe(messageFor(null))
  })

  it('keeps the message of every other failure', () => {
    const limited = new ApiError({ kind: 'ratelimited', status: 429 })
    expect(sendErrorFrom(limited)).toBe(messageFor(limited))
    expect(sendErrorFrom(new TypeError('Failed to fetch'))).toBe(messageFor(new TypeError('Failed to fetch')))
  })
})
