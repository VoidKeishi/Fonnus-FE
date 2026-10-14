import { describe, expect, it } from 'vitest'
import { ApiError, messageFor } from '@/api'
import {
  fieldErrorsFrom,
  firstInvalid,
  sendErrorFrom,
  sentNumberLabel,
  validateWaitlist,
  waitlistFrom,
  withoutError,
} from './waitlist-fields'

/*
 * The waitlist promises "Fonnus sẽ gọi" when a clinic's turn comes. A number
 * refused that could be rung, a line under the wrong field, or a thank-you that
 * reads back a different number all break that promise before it starts.
 */

const FILLED = { contact_name: 'Nguyễn Thị Lan', phone: '090 123 45 67', email: 'lan@phongkham.vn' }

describe('validateWaitlist', () => {
  it('asks for all three fields when the form is sent empty or blank', () => {
    const missing = {
      contact_name: 'Nhập họ và tên của bạn.',
      phone: 'Nhập số điện thoại để chúng tôi gọi lại.',
      email: 'Nhập email để nhận hướng dẫn.',
    }
    expect(validateWaitlist({ contact_name: '', phone: '', email: '' })).toEqual(missing)
    expect(validateWaitlist({ contact_name: '  ', phone: ' ', email: '   ' })).toEqual(missing)
  })

  it('accepts a clinic’s fixed line as well as a mobile', () => {
    expect(validateWaitlist({ ...FILLED, phone: '028 3822 1234' })).toEqual({})
    expect(validateWaitlist(FILLED)).toEqual({})
  })

  it('says a number that cannot be rung back, or an email with no domain, is not right', () => {
    expect(validateWaitlist({ ...FILLED, phone: '1234', email: 'lan@phongkham' })).toEqual({
      phone: 'Số này chưa đúng. VD: 090 123 45 67',
      email: 'Email này chưa đúng, kiểm tra lại giúp mình nhé.',
    })
  })
})

describe('fieldErrorsFrom', () => {
  const refused = (field: string, code: string) =>
    new ApiError({ kind: 'validation', status: 422, code: 'validation_failed', fields: [{ field, code }] })

  it('puts a refused name back under its field as the missing line, whatever the code', () => {
    expect(fieldErrorsFrom(refused('contact_name', 'too_long'))).toEqual({ contact_name: 'Nhập họ và tên của bạn.' })
  })

  it('tells a missing phone or email from a wrong one', () => {
    expect(fieldErrorsFrom(refused('phone', 'required'))).toEqual({ phone: 'Nhập số điện thoại để chúng tôi gọi lại.' })
    expect(fieldErrorsFrom(refused('phone', 'invalid_phone'))).toEqual({ phone: 'Số này chưa đúng. VD: 090 123 45 67' })
    expect(fieldErrorsFrom(refused('email', 'required'))).toEqual({ email: 'Nhập email để nhận hướng dẫn.' })
    expect(fieldErrorsFrom(refused('email', 'too_long'))).toEqual({
      email: 'Email này chưa đúng, kiểm tra lại giúp mình nhé.',
    })
  })

  it('ignores a field the form does not have, and an error that is not a refusal of the fields', () => {
    expect(fieldErrorsFrom(refused('source', 'invalid'))).toEqual({})
    expect(fieldErrorsFrom(new ApiError({ kind: 'server', status: 503 }))).toEqual({})
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
  })

  it('keeps the message of every other failure', () => {
    const down = new ApiError({ kind: 'server', status: 503 })
    expect(sendErrorFrom(down)).toBe(messageFor(down))
  })
})

describe('firstInvalid', () => {
  it('picks the field highest on the form, whatever order the errors came in', () => {
    expect(firstInvalid({ email: 'x', phone: 'y' })).toBe('phone')
    expect(firstInvalid({})).toBeUndefined()
  })
})

describe('withoutError', () => {
  it('clears only the line of the field being edited', () => {
    expect(withoutError({ contact_name: 'a', phone: 'b', email: 'c' }, 'phone')).toEqual({ contact_name: 'a', email: 'c' })
  })
})

describe('waitlistFrom', () => {
  it('sends trimmed text and the number in national digits', () => {
    expect(waitlistFrom({ contact_name: ' Nguyễn Thị Lan ', phone: '+84 28 3822 1234', email: ' lan@phongkham.vn ' })).toEqual({
      contact_name: 'Nguyễn Thị Lan',
      phone: '02838221234',
      email: 'lan@phongkham.vn',
    })
  })
})

describe('sentNumberLabel', () => {
  it('groups a mobile and a fixed line, and reads a hotline back whole', () => {
    expect(sentNumberLabel('0901234567')).toBe('090 123 45 67')
    expect(sentNumberLabel('02838221234')).toBe('028 3822 1234')
    expect(sentNumberLabel('19001234')).toBe('19001234')
  })
})
