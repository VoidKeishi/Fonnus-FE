import { MAX_ADDRESS_LENGTH, MAX_EMAIL_LENGTH, MAX_LOCATIONS, MAX_NAME_LENGTH } from '@/api/lead-limits'
import { isValidCallbackNumber, isValidEmail, normalizeCallbackNumber } from '@/api/phone'
import type { HotlineLocation, HotlineReportInput, LeadInput } from '@/api/contracts'
import type { FieldError } from '@/api/errors'

/*
 * The two marketing forms' bodies, checked again on the server (ADR 0005
 * point 5).
 *
 * The rules are the forms' own (`features/marketing/sections/lead-fields.ts`,
 * `features/marketing/hotline/report-fields.ts`): text trimmed and non-empty,
 * an email that looks like one, a number a person can be rung back on, 1–20
 * locations. The length caps are the server's addition, read from the same
 * `@/api/lead-limits` the inputs take their `maxLength` from, so a visitor
 * typing in the form never meets them. Anything the browser did not check is
 * treated as if it had not: a non-string is missing.
 */

export { MAX_ADDRESS_LENGTH, MAX_EMAIL_LENGTH, MAX_LOCATIONS, MAX_NAME_LENGTH }

export type LeadParse =
  | { ok: true; lead: LeadInput }
  | { ok: false; errors: FieldError[] }

export type HotlineReportParse =
  | { ok: true; report: HotlineReportInput }
  | { ok: false; errors: FieldError[] }

type Fields = Record<string, unknown>

function isPlainObject(body: unknown): body is Fields {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
}

function trimmedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** `required` when empty, `too_long` past `max`. */
function textError(field: string, text: string, max: number): FieldError | null {
  if (!text) return { field, code: 'required' }
  if (text.length > max) return { field, code: 'too_long' }
  return null
}

function nameError(field: 'clinic_name' | 'contact_name', name: string): FieldError | null {
  return textError(field, name, MAX_NAME_LENGTH)
}

function phoneError(phone: string, field = 'phone'): FieldError | null {
  if (!phone) return { field, code: 'required' }
  if (!isValidCallbackNumber(phone)) return { field, code: 'invalid_phone' }
  return null
}

/** Length before shape, so an oversized string is refused for its size. */
function emailError(email: string): FieldError | null {
  return textError('email', email, MAX_EMAIL_LENGTH) ?? (isValidEmail(email) ? null : { field: 'email', code: 'invalid_email' })
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

/** One location, checked under its `locations.<i>` path; an entry that is not an object has neither part. */
function parseLocation(entry: unknown, index: number): { location: HotlineLocation; errors: FieldError[] } {
  const fields: Fields = isPlainObject(entry) ? entry : {}
  const address = trimmedText(fields.address)
  const phone = trimmedText(fields.phone)
  const errors = [
    textError(`locations.${String(index)}.address`, address, MAX_ADDRESS_LENGTH),
    phoneError(phone, `locations.${String(index)}.phone`),
  ].filter((error) => error !== null)
  return { location: { address, phone: normalizeCallbackNumber(phone) }, errors }
}

/**
 * The report request to store, or every field that is wrong, in form order:
 * the person, then each location's address and phone, location by location.
 * A list that is missing, empty or longer than the form allows is one error on
 * `locations`, and its rows are not checked. `source` and any other key are
 * ignored, as for `parseLead`.
 */
export function parseHotlineReport(body: unknown): HotlineReportParse {
  const fields: Fields = isPlainObject(body) ? body : {}
  const contact_name = trimmedText(fields.contact_name)
  const email = trimmedText(fields.email)
  const clinic_name = trimmedText(fields.clinic_name)
  const entries: unknown[] = Array.isArray(fields.locations) ? fields.locations : []

  let listError: FieldError | null = null
  if (entries.length === 0) listError = { field: 'locations', code: 'required' }
  else if (entries.length > MAX_LOCATIONS) listError = { field: 'locations', code: 'too_long' }
  const locations = listError === null ? entries.map(parseLocation) : []

  const errors = [
    nameError('contact_name', contact_name),
    emailError(email),
    nameError('clinic_name', clinic_name),
    listError,
    ...locations.flatMap((parsed) => parsed.errors),
  ].filter((error) => error !== null)
  if (errors.length > 0) return { ok: false, errors }

  return { ok: true, report: { contact_name, email, clinic_name, locations: locations.map((parsed) => parsed.location) } }
}
