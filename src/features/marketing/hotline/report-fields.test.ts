import { describe, expect, it } from 'vitest'
import { ApiError, messageFor } from '@/api'
import { sendErrorFrom } from '../sections/lead-fields'
import { firstProblem, locationKey, refusedProblems, reportFrom, validateReport } from './report-fields'
import type { ReportDraft } from './report-fields'

/*
 * The hotline report form is where a chain leaves the numbers we promise to
 * ring and the address the report goes to. A line under the wrong row, a
 * number sent in a form the server rejects, or a refusal that lands nowhere all
 * end the same way: no report.
 */

const FILLED: ReportDraft = {
  contact_name: 'Nguyễn Minh Anh',
  email: 'anh@nhakhoaminhanh.vn',
  clinic_name: 'Nha khoa Minh Anh',
  locations: [
    { id: 'r1', address: '12 Nguyễn Trãi, Quận 1, TP.HCM', phone: '028 3822 1234' },
    { id: 'r2', address: '45 Lê Lợi, Quận 3, TP.HCM', phone: '0901234567' },
  ],
}

const EMPTY: ReportDraft = {
  contact_name: '',
  email: '',
  clinic_name: '',
  locations: [{ id: 'r1', address: '', phone: '' }],
}

describe('validateReport', () => {
  it('asks for every field of an empty form, in form order', () => {
    expect([...validateReport(EMPTY)]).toEqual([
      ['contact_name', 'Nhập tên của bạn.'],
      ['email', 'Nhập email để nhận báo cáo.'],
      ['clinic_name', 'Nhập tên phòng khám.'],
      ['r1/address', 'Nhập địa chỉ của cơ sở này.'],
      ['r1/phone', 'Nhập số hotline khách hay gọi.'],
    ])
  })

  it('treats a field of spaces as empty', () => {
    const spaces = { contact_name: ' ', email: '  ', clinic_name: '   ', locations: [{ id: 'r1', address: ' ', phone: ' ' }] }
    expect(validateReport(spaces).size).toBe(5)
  })

  it('says a malformed email is not right', () => {
    expect([...validateReport({ ...FILLED, email: 'anh@nhakhoa' })]).toEqual([
      ['email', 'Email này chưa đúng, kiểm tra lại giúp mình nhé.'],
    ])
  })

  it('says a number nobody can ring is not right, on its own row, with an example', () => {
    const draft = { ...FILLED, locations: [FILLED.locations[0]!, { ...FILLED.locations[1]!, phone: '0123' }] }
    expect([...validateReport(draft)]).toEqual([['r2/phone', 'Số này chưa đúng. VD: 028 3822 1234']])
  })

  it('accepts a fixed line, a mobile, and a 1900 hotline copied with the country code', () => {
    const draft = { ...FILLED, locations: [...FILLED.locations, { id: 'r3', address: 'Tổng đài', phone: '+84 1900 1234' }] }
    expect(validateReport(draft).size).toBe(0)
  })
})

describe('reportFrom', () => {
  it('trims the text, sends national digits, and keeps the rows in order', () => {
    const draft = {
      contact_name: '  Nguyễn Minh Anh ',
      email: ' anh@nhakhoaminhanh.vn ',
      clinic_name: ' Nha khoa Minh Anh ',
      locations: [
        { id: 'r1', address: ' 12 Nguyễn Trãi ', phone: '028 3822 1234' },
        { id: 'r2', address: '45 Lê Lợi', phone: '+84 1900 1234' },
        { id: 'r3', address: '9 Hai Bà Trưng', phone: '+84 90 123 45 67' },
      ],
    }
    expect(reportFrom(draft)).toEqual({
      contact_name: 'Nguyễn Minh Anh',
      email: 'anh@nhakhoaminhanh.vn',
      clinic_name: 'Nha khoa Minh Anh',
      locations: [
        { address: '12 Nguyễn Trãi', phone: '02838221234' },
        { address: '45 Lê Lợi', phone: '19001234' },
        { address: '9 Hai Bà Trưng', phone: '0901234567' },
      ],
    })
  })
})

describe('refusedProblems', () => {
  const refused = (...fields: [string, string][]) =>
    new ApiError({
      kind: 'validation',
      status: 422,
      code: 'validation_failed',
      fields: fields.map(([field, code]) => ({ field, code })),
    })

  it('drops a refusal of a row deleted while the request was in flight', () => {
    const answer = refused(['locations.1.phone', 'invalid_phone'])
    expect(firstProblem(refusedProblems(answer, ['r0', 'r1'], ['r0']))).toBeUndefined()
  })

  it('keeps a refusal of a row still on the form after another was deleted', () => {
    const answer = refused(['locations.1.phone', 'invalid_phone'])
    expect([...refusedProblems(answer, ['r0', 'r1', 'r2'], ['r1', 'r2']).keys()]).toEqual([
      locationKey('r1', 'phone'),
    ])
  })

  it('puts a refused person field back under it, missing or wrong', () => {
    expect([...refusedProblems(refused(['contact_name', 'required']), ['r1'])]).toEqual([
      ['contact_name', 'Nhập tên của bạn.'],
    ])
    expect([...refusedProblems(refused(['email', 'invalid_email']), ['r1'])]).toEqual([
      ['email', 'Email này chưa đúng, kiểm tra lại giúp mình nhé.'],
    ])
    expect([...refusedProblems(refused(['email', 'required']), ['r1'])]).toEqual([
      ['email', 'Nhập email để nhận báo cáo.'],
    ])
    expect([...refusedProblems(refused(['clinic_name', 'too_long']), ['r1'])]).toEqual([
      ['clinic_name', 'Nhập tên phòng khám.'],
    ])
  })

  it("lands a refused location on the row that was sent at that position", () => {
    expect([...refusedProblems(refused(['locations.1.phone', 'invalid_phone']), ['r1', 'r2'])]).toEqual([
      [locationKey('r2', 'phone'), 'Số này chưa đúng. VD: 028 3822 1234'],
    ])
    expect([...refusedProblems(refused(['locations.0.address', 'required']), ['r1', 'r2'])]).toEqual([
      [locationKey('r1', 'address'), 'Nhập địa chỉ của cơ sở này.'],
    ])
  })

  it('orders the refusals as the form does, so the first one on screen takes the focus', () => {
    const problems = refusedProblems(refused(['locations.0.phone', 'required'], ['email', 'invalid_email']), ['r1'])
    expect(firstProblem(problems)).toBe('email')
    expect([...problems.keys()]).toEqual(['email', 'r1/phone'])
  })

  it('ignores a field the form does not have, and a row that was never sent', () => {
    expect(refusedProblems(refused(['source', 'invalid'], ['locations.5.phone', 'invalid_phone']), ['r1']).size).toBe(0)
  })

  it('finds nothing for an error that is not a refusal', () => {
    expect(refusedProblems(new ApiError({ kind: 'server', status: 503 }), ['r1']).size).toBe(0)
    expect(refusedProblems(new Error('boom'), ['r1']).size).toBe(0)
  })
})

describe('the line under the button', () => {
  it('reads as the plain failure when the refusal named no field of this form', () => {
    const unnamed = new ApiError({ kind: 'validation', status: 422, code: 'validation_failed', fields: [{ field: 'source', code: 'x' }] })
    expect(sendErrorFrom(unnamed)).toBe(messageFor(null))
  })

  it('says what went wrong for any other failure', () => {
    expect(sendErrorFrom(new ApiError({ kind: 'ratelimited', status: 429 }))).toBe(
      'Bạn thao tác hơi nhanh. Đợi một chút rồi thử lại nhé.',
    )
  })
})
