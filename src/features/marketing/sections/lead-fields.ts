import { ApiError, isApiError, isValidCallbackNumber, messageFor, normalizeCallbackNumber } from '@/api'
import type { LeadInput } from '@/api'

/*
 * What the contact form checks before it sends, and where a server's refusal
 * lands. Pure, so the rules are tested without a DOM; `contact-form.tsx` only
 * wires them to the inputs.
 */

/** The three fields, named as the wire names them. */
export type LeadField = keyof LeadInput

/** One Vietnamese line per field that is wrong; a field that is fine is absent. */
export type LeadErrors = Partial<Record<LeadField, string>>

/** Form order: the first invalid one of these takes the focus. */
export const LEAD_FIELDS: readonly LeadField[] = ['clinic_name', 'contact_name', 'phone']

export const EMPTY_LEAD: LeadInput = { clinic_name: '', contact_name: '', phone: '' }

const MISSING: Record<LeadField, string> = {
  clinic_name: 'Nhập tên phòng khám.',
  contact_name: 'Nhập tên của bạn.',
  phone: 'Nhập số điện thoại để chúng tôi gọi lại.',
}

const INVALID_PHONE = 'Số này chưa đúng. VD: 090 123 45 67'

export function validateLead(fields: LeadInput): LeadErrors {
  const errors: LeadErrors = {}
  if (!fields.clinic_name.trim()) errors.clinic_name = MISSING.clinic_name
  if (!fields.contact_name.trim()) errors.contact_name = MISSING.contact_name
  if (!fields.phone.trim()) errors.phone = MISSING.phone
  else if (!isValidCallbackNumber(fields.phone)) errors.phone = INVALID_PHONE
  return errors
}

function isLeadField(field: string): field is LeadField {
  return (LEAD_FIELDS as readonly string[]).includes(field)
}

/**
 * A 422 that names one of the form's fields, as the lines the form itself
 * would have shown. Any code on a name field means it was missing — there is
 * nothing else to get wrong about a name; on the phone, only `required` means
 * missing. Empty for every other error, which the form shows under its button.
 */
export function fieldErrorsFrom(err: unknown): LeadErrors {
  if (!isApiError(err) || err.kind !== 'validation') return {}
  const errors: LeadErrors = {}
  for (const { field, code } of err.fields) {
    if (!isLeadField(field)) continue
    errors[field] = field === 'phone' && code !== 'required' ? INVALID_PHONE : MISSING[field]
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
  // A code with its own sentence (`invalid_phone`) still says what it says.
  const pointsAtMarkedBoxes = line === messageFor(new ApiError({ kind: 'validation' }))
  return pointsAtMarkedBoxes ? messageFor(null) : line
}

export function firstInvalid(errors: LeadErrors): LeadField | undefined {
  return LEAD_FIELDS.find((field) => errors[field] !== undefined)
}

/** The same errors less one field's — editing a field clears only its own line. */
export function withoutError(errors: LeadErrors, cleared: LeadField): LeadErrors {
  const next: LeadErrors = {}
  for (const field of LEAD_FIELDS) {
    const line = errors[field]
    if (field !== cleared && line !== undefined) next[field] = line
  }
  return next
}

/** What goes on the wire: names trimmed, the number in national digits. */
export function leadFrom(fields: LeadInput): LeadInput {
  return {
    clinic_name: fields.clinic_name.trim(),
    contact_name: fields.contact_name.trim(),
    phone: normalizeCallbackNumber(fields.phone),
  }
}
