import { describe, expect, it } from 'vitest'
import { formatBusinessPhone, formatPhone, isValidEmail, isValidPhone, normalizePhone, phoneError } from './phone'

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
