/**
 * The fetch wrapper. Imported only by `*.live.ts` — a mock never touches it.
 *
 * Hand-written rather than a dependency, because what this app actually needs
 * from an HTTP client is about 120 lines: JSON both ways, the session cookie, a
 * timeout, one typed error, and a global 401 hook.
 */
import { API_BASE_URL } from './env'
import { ApiError, kindForStatus } from './errors'
import type { FieldError } from './errors'

const DEFAULT_TIMEOUT_MS = 15_000

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** JSON.stringify'd, unless it is FormData. */
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  /**
   * Written `| undefined` on purpose. Under `exactOptionalPropertyTypes` a
   * plain `signal?: AbortSignal` rejects `{ signal: opts?.signal }`, which is
   * how every caller in `*.live.ts` passes a cancel token through — the whole
   * point of the property is that it is often absent.
   */
  signal?: AbortSignal | undefined
  timeoutMs?: number
  headers?: Record<string, string>
  /** Retry once on network/timeout/5xx. GET only — never set this on a write. */
  retry?: boolean
  parse?: 'json' | 'none'
  /**
   * A 401 is a normal answer here, not a session expiry.
   *
   * Set on `GET /me` and every `/auth/*` route. Without it the session probe's
   * own 401 fires the global sign-out handler, which re-probes, which 401s —
   * an infinite loop on the first page load of a signed-out visitor.
   */
  expect401?: boolean
}

// ------------------------------------------------------------------ 401 hook

type Handler = () => void
let onUnauthorized: Handler | null = null
let lastFiredAt = 0

/**
 * Registered once by `SessionProvider`, cleared on unmount. A module-level
 * setter rather than an import, so `http` never depends on React.
 */
export function setUnauthorizedHandler(fn: Handler | null): void {
  onUnauthorized = fn
}

function fireUnauthorized(): void {
  if (!onUnauthorized) return
  // Three concurrent requests failing at once must produce one sign-out, not three.
  const now = Date.now()
  if (now - lastFiredAt < 1000) return
  lastFiredAt = now
  onUnauthorized()
}

// ------------------------------------------------------------------ helpers

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/** Composes the caller's signal with our timeout so one abort covers both. */
function composeSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

interface ProblemBody {
  code?: string
  title?: string
  detail?: string
  errors?: FieldError[]
}

async function readProblem(res: Response): Promise<ProblemBody> {
  try {
    const text = await res.text()
    return text ? (JSON.parse(text) as ProblemBody) : {}
  } catch {
    return {}
  }
}

const isTimeout = (e: unknown) => e instanceof DOMException && e.name === 'TimeoutError'
const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

// ------------------------------------------------------------------ request

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, timeoutMs = DEFAULT_TIMEOUT_MS, parse = 'json' } = opts
  const url = buildUrl(path, query)

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      // The session is an httpOnly cookie; nothing is stored client-side.
      // Note this makes `Access-Control-Allow-Origin: *` illegal server-side.
      credentials: 'include',
      // Spread rather than `body: undefined`: `RequestInit.body` is typed
      // `BodyInit | null`, and under `exactOptionalPropertyTypes` an explicit
      // `undefined` is not the same as omitting the key.
      ...(body === undefined
        ? {}
        : { body: isForm ? body : JSON.stringify(body) }),
      signal: composeSignal(opts.signal, timeoutMs),
    })
  } catch (e) {
    // A caller-requested abort is not a failure — surface it as its own kind so
    // callers can ignore it instead of rendering "network error" on unmount.
    if (isAbort(e) && opts.signal?.aborted) throw new ApiError({ kind: 'canceled', cause: e })
    if (isTimeout(e) || isAbort(e)) throw new ApiError({ kind: 'timeout', cause: e })
    throw new ApiError({ kind: 'network', cause: e })
  }

  const requestId = res.headers.get('x-request-id')

  if (!res.ok) {
    if (res.status === 401 && !opts.expect401) fireUnauthorized()
    const problem = await readProblem(res)
    throw new ApiError({
      kind: kindForStatus(res.status),
      status: res.status,
      code: problem.code ?? null,
      fields: problem.errors ?? [],
      requestId,
    })
  }

  if (parse === 'none' || res.status === 204) return undefined as T

  try {
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  } catch (e) {
    throw new ApiError({ kind: 'parse', status: res.status, requestId, cause: e })
  }
}

/** One retry, for reads only. Writes are never retried automatically. */
async function requestWithRetry<T>(path: string, opts: RequestOptions): Promise<T> {
  try {
    return await request<T>(path, opts)
  } catch (e) {
    if (opts.retry && e instanceof ApiError && e.retryable) {
      return request<T>(path, { ...opts, retry: false })
    }
    throw e
  }
}

type ReadOptions = Omit<RequestOptions, 'method' | 'body'>
type WriteOptions = Omit<RequestOptions, 'method' | 'body' | 'retry'>

export const http = {
  get: <T>(path: string, o: ReadOptions = {}) =>
    requestWithRetry<T>(path, { ...o, method: 'GET', retry: o.retry ?? true }),

  post: <T>(path: string, body?: unknown, o: WriteOptions = {}) =>
    request<T>(path, { ...o, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, o: WriteOptions = {}) =>
    request<T>(path, { ...o, method: 'PATCH', body }),

  del: <T>(path: string, o: WriteOptions = {}) =>
    request<T>(path, { ...o, method: 'DELETE', parse: o.parse ?? 'none' }),
}
