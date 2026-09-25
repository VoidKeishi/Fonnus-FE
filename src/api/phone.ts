/**
 * Vietnamese phone numbers, as an owner would actually type them: with spaces,
 * with or without the leading 0, or pasted from a contact card as +84.
 *
 * Kept in the API seam rather than in a feature: the national, digits-only form
 * is what the wire carries, and sign-in, the landing hero and the contact form
 * need the same rules — two features may share `@/api`, never each other.
 */

/** Digits only, always in national form (leading 0, 10 digits). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('84')) return `0${digits.slice(2)}`
  if (digits.startsWith('0')) return digits
  return digits ? `0${digits}` : ''
}

/** 090 123 45 67 — the grouping used everywhere in the design. */
export function formatPhone(raw: string): string {
  const d = normalizePhone(raw).slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`
  if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`
}

/**
 * A published business line: 024 7307 7199.
 *
 * `formatPhone` above groups the ten digits of a mobile and truncates
 * anything longer, which turns an eleven-digit landline into nonsense. Fixed
 * lines carry a three-digit area code and eight subscriber digits, grouped in
 * fours the way they are printed on a clinic's signage.
 */
export function formatBusinessPhone(raw: string): string {
  const d = normalizePhone(raw)
  if (d.length === 11) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`
  return formatPhone(d)
}

/**
 * Mobile prefixes only. A landline (024…, 028…) can't receive the SMS code, so
 * it is caught here rather than after a code that never arrives.
 */
const MOBILE_PREFIX = /^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])/

export function isValidPhone(raw: string): boolean {
  const d = normalizePhone(raw)
  return d.length === 10 && MOBILE_PREFIX.test(d)
}

export function phoneError(raw: string): string | null {
  const d = normalizePhone(raw)
  if (d.length < 10) return 'Số điện thoại cần 10 số.'
  if (d.length > 10) return 'Số điện thoại chỉ có 10 số.'
  if (!MOBILE_PREFIX.test(d)) return 'Số này không nhận được tin nhắn. Nhập số di động giúp mình nhé.'
  return null
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim())
}

/*
 * A number a person can ring back — the landing page's contact form. Wider
 * than `isValidPhone`, which is about receiving an SMS: a clinic may leave its
 * front desk's fixed line or its 1800/1900 hotline instead of a mobile.
 */

const FIXED_LINE = /^02\d{9}$/
const HOTLINE = /^1[89]00(\d{4}|\d{6})$/

/**
 * Digits only, in national form, keeping a 1800/1900 hotline as typed.
 *
 * `normalizePhone` puts a 0 in front of anything that lacks one, which turns
 * `1900 1234` into `019001234`, with or without `+84` in front. `84` counts as the country code only when
 * enough digits follow it for a whole national number (nine for a mobile, ten
 * for a fixed line); a shorter run is a mobile typed without its 0, such as
 * `84 123 4567` for 084 123 4567. A 0 written after the country code —
 * `+84 (0) 90…` — is kept once, not doubled.
 */
export function normalizeCallbackNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (HOTLINE.test(digits)) return digits
  // A hotline copied from a listing can carry the country code: `+84 1900 1234`.
  const afterCountryCode = digits.startsWith('84') ? digits.slice(2) : digits
  if (HOTLINE.test(afterCountryCode)) return afterCountryCode
  if (digits.startsWith('84') && digits.length >= 11) {
    const national = digits.slice(2)
    return national.startsWith('0') ? national : `0${national}`
  }
  if (digits.startsWith('0')) return digits
  return digits ? `0${digits}` : ''
}

/** A mobile (10 digits), a fixed line (11 digits, `02…`) or a 1800/1900 hotline (8 or 10 digits). */
export function isValidCallbackNumber(raw: string): boolean {
  const d = normalizeCallbackNumber(raw)
  return (d.length === 10 && MOBILE_PREFIX.test(d)) || FIXED_LINE.test(d) || HOTLINE.test(d)
}
