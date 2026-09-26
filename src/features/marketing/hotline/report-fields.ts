import { isApiError, isValidCallbackNumber, isValidEmail, normalizeCallbackNumber } from '@/api'
import type { HotlineReportInput } from '@/api'

/*
 * What the "Chấm điểm hotline" form checks before it sends, where a server's
 * refusal lands, and what goes on the wire. Pure, so the rules are tested
 * without a DOM; `report-form.tsx` only wires them to the inputs.
 *
 * A problem is keyed by the field it belongs to: the three wire names for the
 * person, and `<row id>/<part>` for a location. A location is keyed by its row
 * id, not its position, so a line stays on its row when a row above is removed.
 */

/** A chain larger than this is a sales conversation, not a form. */
export const MAX_LOCATIONS = 20

export type PersonField = 'contact_name' | 'email' | 'clinic_name'
export type LocationPart = 'address' | 'phone'

/** Form order: the first problem in this order takes the focus. */
export const PERSON_FIELDS: readonly PersonField[] = ['contact_name', 'email', 'clinic_name']
const LOCATION_PARTS: readonly LocationPart[] = ['address', 'phone']

export interface LocationRow {
  /** Stable for the row's life; never sent. */
  id: string
  address: string
  phone: string
}

export interface ReportDraft {
  contact_name: string
  email: string
  clinic_name: string
  locations: readonly LocationRow[]
}

/** Who is asking: the part of the draft that is not a location. */
export type PersonDraft = Pick<ReportDraft, PersonField>

export const EMPTY_PERSON: PersonDraft = { contact_name: '', email: '', clinic_name: '' }

export function emptyLocation(id: string): LocationRow {
  return { id, address: '', phone: '' }
}

export function locationKey(rowId: string, part: LocationPart): string {
  return `${rowId}/${part}`
}

/** Every problem, field key → its line, in the order the fields appear on the form. */
export type Problems = ReadonlyMap<string, string>

const MISSING: Record<PersonField | LocationPart, string> = {
  contact_name: 'Nhập tên của bạn.',
  email: 'Nhập email để nhận báo cáo.',
  clinic_name: 'Nhập tên phòng khám.',
  address: 'Nhập địa chỉ của cơ sở này.',
  phone: 'Nhập số hotline khách hay gọi.',
}

/* Only these two can be present and still wrong; a name or an address can only be missing. */
const INVALID_EMAIL = 'Email này chưa đúng, kiểm tra lại giúp mình nhé.'
const INVALID_PHONE = 'Số này chưa đúng. VD: 028 3822 1234'

export function validateReport(draft: ReportDraft): Problems {
  const out = new Map<string, string>()
  if (!draft.contact_name.trim()) out.set('contact_name', MISSING.contact_name)
  if (!draft.email.trim()) out.set('email', MISSING.email)
  else if (!isValidEmail(draft.email)) out.set('email', INVALID_EMAIL)
  if (!draft.clinic_name.trim()) out.set('clinic_name', MISSING.clinic_name)
  for (const row of draft.locations) {
    if (!row.address.trim()) out.set(locationKey(row.id, 'address'), MISSING.address)
    if (!row.phone.trim()) out.set(locationKey(row.id, 'phone'), MISSING.phone)
    else if (!isValidCallbackNumber(row.phone)) out.set(locationKey(row.id, 'phone'), INVALID_PHONE)
  }
  return out
}

/** What goes on the wire: text trimmed, numbers in national digits, rows in form order. */
export function reportFrom(draft: ReportDraft): HotlineReportInput {
  return {
    contact_name: draft.contact_name.trim(),
    email: draft.email.trim(),
    clinic_name: draft.clinic_name.trim(),
    locations: draft.locations.map((row) => ({
      address: row.address.trim(),
      phone: normalizeCallbackNumber(row.phone),
    })),
  }
}

/** The line a refused field shows: `required` is the missing line, anything else the "chưa đúng" one where there is one. */
function refusedLine(field: PersonField | LocationPart, code: string): string {
  if (code === 'required') return MISSING[field]
  if (field === 'email') return INVALID_EMAIL
  if (field === 'phone') return INVALID_PHONE
  return MISSING[field]
}

const LOCATION_PATH = /^locations\.(\d+)\.(address|phone)$/

/** The form's key for a wire path, or undefined for a path this form does not have. */
function keyForPath(
  path: string,
  sentRowIds: readonly string[],
  presentRowIds: readonly string[],
): { key: string; field: PersonField | LocationPart } | undefined {
  if ((PERSON_FIELDS as readonly string[]).includes(path)) return { key: path, field: path as PersonField }
  const match = LOCATION_PATH.exec(path)
  if (!match) return undefined
  const rowId = sentRowIds[Number(match[1])]
  const part = match[2] as LocationPart
  // A row deleted while the request was in flight has no field left to carry the line.
  if (rowId === undefined || !presentRowIds.includes(rowId)) return undefined
  return { key: locationKey(rowId, part), field: part }
}

/**
 * A 422 that names fields of this form, as the lines the form itself would
 * have shown, in form order. `sentRowIds` are the rows in the order they were
 * sent, so `locations.1.phone` lands on the second row that went out even if
 * the list changed while the request was in flight; a refusal of a row that
 * is no longer in `presentRowIds` is dropped. Empty for every other error, and
 * when nothing left on the form can carry a line; the form then shows the
 * failure under its button.
 */
export function refusedProblems(
  err: unknown,
  sentRowIds: readonly string[],
  presentRowIds: readonly string[] = sentRowIds,
): Problems {
  if (!isApiError(err) || err.kind !== 'validation') return new Map()
  const found = new Map<string, string>()
  for (const { field: path, code } of err.fields) {
    const target = keyForPath(path, sentRowIds, presentRowIds)
    if (target && !found.has(target.key)) found.set(target.key, refusedLine(target.field, code))
  }
  const ordered = new Map<string, string>()
  const order = [...PERSON_FIELDS, ...sentRowIds.flatMap((id) => LOCATION_PARTS.map((part) => locationKey(id, part)))]
  for (const key of order) {
    const line = found.get(key)
    if (line !== undefined) ordered.set(key, line)
  }
  return ordered
}

/** The first key of a problem list — the field that takes the focus. */
export function firstProblem(problems: Problems): string | undefined {
  return problems.keys().next().value
}
