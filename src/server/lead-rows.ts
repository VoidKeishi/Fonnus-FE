import type { LeadInput } from '@/api/contracts'

/*
 * What one contact request looks like in the `leads` tab (ADR 0005 point 7).
 * Every cell is a string and is appended with `valueInputOption=RAW`, so a
 * phone keeps its leading 0 and a name that starts with `=` stays text.
 */

/** Vietnam has kept UTC+7 all year since 1975, so a fixed offset is exact. */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000

function twoDigits(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * `2026-09-30 14:05:09` — the wall-clock time in Vietnam, which is the time
 * the team working the sheet reads. The offset is left off because every row
 * carries the same one.
 */
export function vietnamTimestamp(at: Date): string {
  const local = new Date(at.getTime() + VIETNAM_OFFSET_MS)
  const date = `${String(local.getUTCFullYear())}-${twoDigits(local.getUTCMonth() + 1)}-${twoDigits(local.getUTCDate())}`
  const time = `${twoDigits(local.getUTCHours())}:${twoDigits(local.getUTCMinutes())}:${twoDigits(local.getUTCSeconds())}`
  return `${date} ${time}`
}

/** Received time, clinic name, contact name, phone, source. */
export function leadRow(lead: LeadInput, receivedAt: Date): string[] {
  return [vietnamTimestamp(receivedAt), lead.clinic_name, lead.contact_name, lead.phone, 'landing_contact']
}
