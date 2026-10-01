/**
 * The length caps of the two marketing forms, in one place: the forms put them
 * on their inputs as `maxLength`, and the route handlers refuse anything past
 * them with `too_long` (ADR 0005 point 5). Reading the same numbers is what
 * keeps a visitor typing in the form from ever meeting that refusal.
 *
 * Plain constants with no imports, so `src/server/` can read them without
 * pulling in the rest of the API seam. Lengths are UTF-16 units — what
 * `maxLength` counts — measured on the trimmed text.
 *
 * `src/server/request-body.ts` sizes `MAX_BODY_BYTES` from these numbers, so
 * raising one means rechecking that.
 */

/** A clinic name or a person's name, on both forms. */
export const MAX_NAME_LENGTH = 200

/** The longest address an email can have (RFC 5321's path limit, less the brackets). */
export const MAX_EMAIL_LENGTH = 254

/** One location's address on the hotline report. */
export const MAX_ADDRESS_LENGTH = 500

/** Locations on one hotline report. A chain larger than this is a sales conversation, not a form. */
export const MAX_LOCATIONS = 20
