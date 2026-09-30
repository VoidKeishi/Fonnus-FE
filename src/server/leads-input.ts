import { isValidCallbackNumber, normalizeCallbackNumber } from '@/api/phone'
import type { LeadInput } from '@/api/contracts'
import type { FieldError } from '@/api/errors'

/*
 * The contact form's body, checked again on the server (ADR 0005 point 5).
 *
 * The rules are the form's own (`features/marketing/sections/lead-fields.ts`):
 * names trimmed and non-empty, the number one a person can be rung back on.
 * The length cap is the server's addition — the inputs are to carry the same
 * `maxLength`, so a visitor typing in the form never meets it. Anything the
 * browser did not check is treated as if it had not: a non-string is missing.
 */

/** The longest clinic or contact name accepted, in UTF-16 units — what `maxLength` counts. */
export const MAX_NAME_LENGTH = 200

export type LeadParse =
  | { ok: true; lead: LeadInput }
  | { ok: false; errors: FieldError[] }

type Fields = Record<string, unknown>

function isPlainObject(body: unknown): body is Fields {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
}

function trimmedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function nameError(field: 'clinic_name' | 'contact_name', name: string): FieldError | null {
  if (!name) return { field, code: 'required' }
  if (name.length > MAX_NAME_LENGTH) return { field, code: 'too_long' }
  return null
}

function phoneError(phone: string): FieldError | null {
  if (!phone) return { field: 'phone', code: 'required' }
  if (!isValidCallbackNumber(phone)) return { field: 'phone', code: 'invalid_phone' }
  return null
}

/**
 * The lead to store, or every field that is wrong, in form order. A body that
 * is not an object has none of the three fields. `source` and any other key
 * are ignored: the server, not the visitor, says where a row came from.
 */
export function parseLead(body: unknown): LeadParse {
  const fields: Fields = isPlainObject(body) ? body : {}
  const clinic_name = trimmedText(fields.clinic_name)
  const contact_name = trimmedText(fields.contact_name)
  const phone = trimmedText(fields.phone)

  const errors = [
    nameError('clinic_name', clinic_name),
    nameError('contact_name', contact_name),
    phoneError(phone),
  ].filter((error) => error !== null)
  if (errors.length > 0) return { ok: false, errors }

  return { ok: true, lead: { clinic_name, contact_name, phone: normalizeCallbackNumber(phone) } }
}
