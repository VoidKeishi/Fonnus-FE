/**
 * Carries the number typed in the landing hero across to the sign-up page, so
 * that field is not asked for twice. sessionStorage rather than a query param:
 * it survives a reload, but the owner's number never lands in the URL bar,
 * browser history or a shared link.
 *
 * Here rather than in a feature because its writer (the landing hero) and its
 * reader (sign-up) live in two features, and features never import each other.
 * Storage is touched only inside a call, never at import, so a server render
 * that reaches this module finds nothing to trip on.
 */
const KEY = 'fonnus.signup.phone'

export function stashPhone(phone: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(KEY, phone)
  } catch {
    // Private mode or storage disabled — sign-up just asks for the number.
  }
}

/**
 * Reads and clears: the number is consumed once, by the first screen to ask.
 * Its consumer is the sign-up page at `/dang-ky` (PLAN.md §Roadmap F1b).
 */
export function takePhone(): string {
  if (typeof window === 'undefined') return ''
  try {
    const value = window.sessionStorage.getItem(KEY) ?? ''
    window.sessionStorage.removeItem(KEY)
    return value
  } catch {
    return ''
  }
}
