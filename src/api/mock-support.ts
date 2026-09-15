/**
 * Shared helpers for the mock implementations: fake latency, fake failure, and
 * the demo fixtures.
 *
 * Nothing here is imported by a `*.live.ts` file.
 */
import { MOCK_FAILURE_RATE, MOCK_LATENCY_MS } from './env'
import { ApiError } from './errors'
import type { ApiErrorKind } from './errors'
import type { GoogleAccount } from './contracts'

/**
 * The one demo account. Sign in with this number and code to reach the app
 * shell. The two other numbers exist so the "already registered" branch of
 * sign-up stays reachable.
 */
export const DEMO_ACCOUNT = {
  phone: '0914378064',
  code: '111002',
  displayName: 'Nguyễn Lan',
  clinic: 'Nha khoa Việt Smile',
  plan: 'Gói Tiêu chuẩn',
} as const

export const REGISTERED_PHONES: ReadonlySet<string> = new Set([
  DEMO_ACCOUNT.phone,
  '0901234567',
  '0987654321',
])

/** Demo accounts for the in-page Google chooser (frame 05). */
export const GOOGLE_ACCOUNTS: readonly GoogleAccount[] = [
  { initials: 'NL', name: 'Nguyễn Lan', email: 'lan@vietsmile.vn' },
  { initials: 'VS', name: 'Việt Smile Clinic', email: 'info@vietsmile.vn' },
]

/**
 * Pretends the network took a moment, and honours an abort while it does.
 *
 * `scale` lets one call feel slower or faster than the baseline without
 * hardcoding a second number — a code verification should feel weightier than
 * a toggle.
 */
export function delay(scale = 1, signal?: AbortSignal): Promise<void> {
  const ms = Math.round(MOCK_LATENCY_MS * scale)
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError({ kind: 'canceled' }))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new ApiError({ kind: 'canceled' }))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Throws at the configured rate, so the error paths are reachable without a
 * backend. `NEXT_PUBLIC_MOCK_FAILURE_RATE=1` makes every call fail.
 *
 * This is the only way to see the save-rollback, retry and connection-error
 * screens before there is a server to break.
 */
export function maybeFail(kind: ApiErrorKind = 'server', code?: string): void {
  if (MOCK_FAILURE_RATE <= 0) return
  if (Math.random() >= MOCK_FAILURE_RATE) return
  throw new ApiError({
    kind,
    status: kind === 'server' ? 500 : null,
    code: code ?? null,
  })
}

/**
 * localStorage that never throws — private mode, quota, disabled storage, and
 * under Next.js one more case the Vite app never had: this module can be
 * evaluated on the server during a render, where `window` does not exist. A
 * server render therefore reads as "no stored session", which is the right
 * answer — the mock's session belongs to one browser tab and the server has
 * never seen it.
 */
const hasWindow = (): boolean => typeof window !== 'undefined'

export const storage = {
  read(key: string): string | null {
    if (!hasWindow()) return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  write(key: string, value: string): void {
    if (!hasWindow()) return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* private mode: edits live for the session only */
    }
  },
  remove(key: string): void {
    if (!hasWindow()) return
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}
