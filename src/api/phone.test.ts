import { describe, expect, it } from 'vitest'
import {
  formatBusinessPhone,
  formatPhone,
  isValidCallbackNumber,
  isValidEmail,
  isValidPhone,
  normalizeCallbackNumber,
  normalizePhone,
  phoneError,
} from './phone'

/*
 * Phone handling is the one piece of pure logic on the auth screens, and the
 * one an owner can break by typing what they actually have: a number copied
 * from Zalo as +84, a number with spaces, or the clinic's landline.
 */

describe('normalizePhone', () => {
  it('keeps a national number as it is', () => {
    expect(normalizePhone('0914378064')).toBe('0914378064')
  })

  it('turns +84 into the leading zero', () => {
    expect(normalizePhone('+84 914 378 064')).toBe('0914378064')
  })

  it('adds the leading zero to a number pasted without one', () => {
    expect(normalizePhone('914378064')).toBe('0914378064')
  })

  it('is empty for an empty input rather than a bare zero', () => {
    expect(normalizePhone('')).toBe('')
  })
})

describe('formatPhone', () => {
  it('groups a mobile as the design shows it', () => {
    expect(formatPhone('0914378064')).toBe('091 437 80 64')
  })

  it('groups as the owner types, without waiting for all ten digits', () => {
    expect(formatPhone('0914')).toBe('091 4')
  })
})

describe('formatBusinessPhone', () => {
  it('groups an eleven-digit landline in fours', () => {
    expect(formatBusinessPhone('02473077199')).toBe('024 7307 7199')
  })
})

describe('isValidPhone', () => {
  it('accepts a mobile', () => {
    expect(isValidPhone('0914378064')).toBe(true)
  })

  it('rejects a landline, which cannot receive the SMS code', () => {
    expect(isValidPhone('02473077199')).toBe(false)
    expect(phoneError('02473077199')).not.toBeNull()
  })

  it('rejects a number that is too short', () => {
    expect(isValidPhone('09143780')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('accepts an ordinary address', () => {
    expect(isValidEmail('lan@vietsmile.vn')).toBe(true)
  })

  it('rejects an address with no domain', () => {
    expect(isValidEmail('lan@')).toBe(false)
  })
})

/*
 * The contact form takes any number a person can be rung back on. The trap is
 * the hotline: the sign-in normalizer would prefix its 0 and send a number
 * that does not exist.
 */
describe('normalizeCallbackNumber', () => {
  it.each([
    ['0901234567', '0901234567'],
    ['090 123 45 67', '0901234567'],
    ['+84 90 123 4567', '0901234567'],
    ['028 3822 1234', '02838221234'],
    ['1900 1234', '19001234'],
    ['1800 123 456', '1800123456'],
    ['+84 28 3822 1234', '02838221234'],
    ['+84 1900 1234', '19001234'],
    ['+84 1800 123 456', '1800123456'],
  ])('writes %s as %s on the wire', (typed, wire) => {
    expect(normalizeCallbackNumber(typed)).toBe(wire)
  })

  it('keeps a 1900 hotline without gaining a leading zero', () => {
    expect(normalizeCallbackNumber('1900.1234')).toBe('19001234')
  })

  it('keeps one zero when +84 is followed by the national 0', () => {
    expect(normalizeCallbackNumber('+84 (0) 90 123 4567')).toBe('0901234567')
  })

  it('reads a short run starting 84 as a mobile typed without its 0', () => {
    expect(normalizeCallbackNumber('84 123 4567')).toBe('0841234567')
  })
})

describe('isValidCallbackNumber', () => {
  it.each([
    '0901234567',
    '090 123 45 67',
    '+84 90 123 4567',
    '028 3822 1234',
    '+84 28 3822 1234',
    '1900 1234',
    '+84 1900 1234',
    '1800 123 456',
  ])(
    'accepts %s',
    (typed) => {
      expect(isValidCallbackNumber(typed)).toBe(true)
    },
  )

  it('rejects a number too short to be anything', () => {
    expect(isValidCallbackNumber('12345')).toBe(false)
  })

  it('rejects ten digits that are neither a mobile nor a fixed line', () => {
    expect(isValidCallbackNumber('0123456789')).toBe(false)
  })

  it('rejects a mobile missing a digit', () => {
    expect(isValidCallbackNumber('090123456')).toBe(false)
  })
})

describe('the sign-in rules beside it', () => {
  it('still treat a mobile the way sign-in always has', () => {
    expect(normalizePhone('+84 914 378 064')).toBe('0914378064')
    expect(isValidPhone('0914378064')).toBe(true)
  })
})
