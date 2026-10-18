/*
 * The two numbers the "Nghe thử" call screen says of the visitor's hour (ADR
 * 0008 point 5), as words. The hour itself is the server's (ADR 0009): what is
 * left and when it is back come from `api.voice`, never from this browser.
 */

/**
 * What is left, as the consent line says it: "2 phút 10 giây", "2 phút",
 * "40 giây". Whole seconds, rounded down, but never "0 giây" for a remainder
 * that still opens a call.
 */
export function remainingLabel(ms: number): string {
  const seconds = Math.max(1, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${String(rest)} giây`
  if (rest === 0) return `${String(minutes)} phút`
  return `${String(minutes)} phút ${String(rest)} giây`
}

/** How long until the budget is back, in whole minutes rounded up: "42 phút", never "0 phút". */
export function waitLabel(ms: number): string {
  return `${String(Math.max(1, Math.ceil(ms / 60_000)))} phút`
}
