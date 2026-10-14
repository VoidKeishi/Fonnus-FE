import {
  ApiError,
  formatBusinessPhone,
  isApiError,
  isValidCallbackNumber,
  isValidEmail,
  messageFor,
  normalizeCallbackNumber,
} from '@/api'
import type { WaitlistInput } from '@/api'

/*
 * What the waitlist form checks before it sends, and where a server's refusal
 * lands. Pure, so the rules are tested without a DOM; `waitlist-page.tsx` only
 * wires them to the inputs.
 */

/** The three fields, named as the wire names them. */
export type WaitlistField = keyof WaitlistInput

/** One Vietnamese line per field that is wrong; a field that is fine is absent. */
export type WaitlistErrors = Partial<Record<WaitlistField, string>>

/** Form order: the first invalid one of these takes the focus. */
export const WAITLIST_FIELDS: readonly WaitlistField[] = ['contact_name', 'phone', 'email']

export const EMPTY_WAITLIST: WaitlistInput = { contact_name: '', phone: '', email: '' }

const MISSING: Record<WaitlistField, string> = {
  contact_name: 'Nhập họ và tên của bạn.',
  phone: 'Nhập số điện thoại để chúng tôi gọi lại.',
  email: 'Nhập email để nhận hướng dẫn.',
}

const INVALID_PHONE = 'Số này chưa đúng. VD: 090 123 45 67'
const INVALID_EMAIL = 'Email này chưa đúng, kiểm tra lại giúp mình nhé.'

export function validateWaitlist(fields: WaitlistInput): WaitlistErrors {
  const errors: WaitlistErrors = {}
  if (!fields.contact_name.trim()) errors.contact_name = MISSING.contact_name
  if (!fields.phone.trim()) errors.phone = MISSING.phone
  else if (!isValidCallbackNumber(fields.phone)) errors.phone = INVALID_PHONE
  if (!fields.email.trim()) errors.email = MISSING.email
  else if (!isValidEmail(fields.email)) errors.email = INVALID_EMAIL
  return errors
}

function isWaitlistField(field: string): field is WaitlistField {
  return (WAITLIST_FIELDS as readonly string[]).includes(field)
}

/**
 * A 422 that names one of the form's fields, as the lines the form itself
 * would have shown: on the name, whatever the code, the missing line; on the
 * phone and the email, only `required` means missing. Empty for every other
 * error, which the form shows under its button.
 */
export function fieldErrorsFrom(err: unknown): WaitlistErrors {
  if (!isApiError(err) || err.kind !== 'validation') return {}
  const errors: WaitlistErrors = {}
  for (const { field, code } of err.fields) {
    if (!isWaitlistField(field)) continue
    if (field === 'contact_name' || code === 'required') errors[field] = MISSING[field]
    else errors[field] = field === 'phone' ? INVALID_PHONE : INVALID_EMAIL
  }
  return errors
}

/**
 * The line under the button, for a refusal no field can carry. The generic
 * validation line asks the reader to look at the marked boxes; when the server
 * named no field of this form, nothing is marked, so it reads as the plain
 * failure instead.
 */
export function sendErrorFrom(err: unknown): string {
  const line = messageFor(err)
  if (!isApiError(err) || err.kind !== 'validation') return line
  const pointsAtMarkedBoxes = line === messageFor(new ApiError({ kind: 'validation' }))
  return pointsAtMarkedBoxes ? messageFor(null) : line
}

export function firstInvalid(errors: WaitlistErrors): WaitlistField | undefined {
  return WAITLIST_FIELDS.find((field) => errors[field] !== undefined)
}

/** The same errors less one field's — editing a field clears only its own line. */
export function withoutError(errors: WaitlistErrors, cleared: WaitlistField): WaitlistErrors {
  const next: WaitlistErrors = {}
  for (const field of WAITLIST_FIELDS) {
    const line = errors[field]
    if (field !== cleared && line !== undefined) next[field] = line
  }
  return next
}

/** What goes on the wire: text trimmed, the number in national digits. */
export function waitlistFrom(fields: WaitlistInput): WaitlistInput {
  return {
    contact_name: fields.contact_name.trim(),
    phone: normalizeCallbackNumber(fields.phone),
    email: fields.email.trim(),
  }
}

/**
 * The sent number as the thank-you line reads it back: a mobile grouped as
 * everywhere else (090 123 45 67), a fixed line as printed on a clinic's signage
 * (028 3822 1234). A hotline stays in digits: `formatBusinessPhone` would put a
 * 0 in front of a 1900 number.
 */
export function sentNumberLabel(phone: string): string {
  return phone.startsWith('0') ? formatBusinessPhone(phone) : phone
}
