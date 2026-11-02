import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './env'
import { ApiError, fieldMessageFor } from './errors'
import { buildUrl, http, setUnauthorizedHandler } from './http'

/*
 * In production `API_BASE_URL` is Fonnus-BE's origin, and the two marketing
 * forms are received by this app instead (ADR 0005). A clinic's name and phone
 * sent to the wrong server is a lost lead, so which base a path gets is worth
 * pinning.
 */

describe('buildUrl', () => {
  it('puts a backend path under the API base', () => {
    expect(buildUrl('/me')).toBe(`${API_BASE_URL}/me`)
  })

  it('leaves a path on this app’s own origin as written', () => {
    expect(buildUrl('/api/leads', { ownOrigin: true })).toBe('/api/leads')
    expect(buildUrl('/api/leads/hotline-report', { ownOrigin: true })).toBe('/api/leads/hotline-report')
  })
})

/*
 * The access token lives 15 minutes (ADR 0011). Get the refresh wrong and an
 * owner is signed out mid-edit every quarter hour, or a burst of requests
 * spends the refresh token several times over, or the probe loops forever on a
 * signed-out visitor. Each case below is one of those.
 */

const REFRESH_URL = `${API_BASE_URL}/auth/refresh`

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const unauthorized = () => json(401, { status: 401, code: 'unauthorized' })

/** Answers each URL from its own queue, and records every call. */
function stubFetch(answers: Record<string, Array<() => Response | Promise<Response>>>) {
  const calls: string[] = []
  const fetchStub = vi.fn((url: string) => {
    calls.push(url)
    const next = answers[url]?.shift()
    if (!next) throw new Error(`unexpected fetch ${url}`)
    return Promise.resolve(next())
  })
  vi.stubGlobal('fetch', fetchStub)
  return calls
}

describe('a 401 on a business request', () => {
  const onUnauthorized = vi.fn()
  // `http.ts` lets the sign-out handler fire once a second, across the whole
  // process, so each test here starts its own second. Only `Date` is faked:
  // the concurrent case below needs real timers to let its 401s land.
  let second = 0

  beforeEach(() => {
    setUnauthorizedHandler(onUnauthorized)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 2, 9, 0, (second += 2)))
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
    onUnauthorized.mockReset()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('refreshes once and answers with the retried request', async () => {
    const url = `${API_BASE_URL}/users/u1`
    const calls = stubFetch({
      [url]: [unauthorized, () => json(200, { id: 'u1', mobile_number: '0914378064', full_name: 'Nguyễn Lan' })],
      [REFRESH_URL]: [() => json(200, { user_id: 'u1' })],
    })

    await expect(http.get('/users/u1')).resolves.toEqual({
      id: 'u1',
      mobile_number: '0914378064',
      full_name: 'Nguyễn Lan',
    })
    expect(calls).toEqual([url, REFRESH_URL, url])
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('signs out once, without a retry, when the refresh is refused', async () => {
    const url = `${API_BASE_URL}/users/u1`
    const calls = stubFetch({
      [url]: [unauthorized],
      [REFRESH_URL]: [() => json(401, { status: 401, code: 'session_expired' })],
    })

    const failure = http.get('/users/u1')
    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(calls).toEqual([url, REFRESH_URL])
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('hands a refresh the server could not answer back to the caller, signing nobody out', async () => {
    const url = `${API_BASE_URL}/x`
    const calls = stubFetch({
      [url]: [unauthorized],
      [REFRESH_URL]: [() => json(503, { status: 503, code: 'database_unavailable' })],
    })

    await expect(http.post('/x', {})).rejects.toMatchObject({ kind: 'server' })
    expect(calls).toEqual([url, REFRESH_URL])
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('signs out once when the request sent again after a refresh is refused too', async () => {
    const url = `${API_BASE_URL}/x`
    const calls = stubFetch({
      [url]: [unauthorized, unauthorized],
      [REFRESH_URL]: [() => json(200, { user_id: 'u1' })],
    })

    await expect(http.post('/x', {})).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(calls).toEqual([url, REFRESH_URL, url])
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('shares one refresh among requests that fail together', async () => {
    let releaseRefresh: (res: Response) => void = () => undefined
    const pendingRefresh = new Promise<Response>((resolve) => {
      releaseRefresh = resolve
    })
    const paths = ['/a', '/b', '/c']
    const answers: Record<string, Array<() => Response | Promise<Response>>> = {
      [REFRESH_URL]: [() => pendingRefresh],
    }
    for (const p of paths) answers[`${API_BASE_URL}${p}`] = [unauthorized, () => json(200, { path: p })]
    const calls = stubFetch(answers)

    const all = Promise.all(paths.map((p) => http.get(p)))
    // Let all three 401s arrive while the refresh is still in flight.
    await new Promise((resolve) => setTimeout(resolve, 0))
    releaseRefresh(json(200, { user_id: 'u1' }))

    await expect(all).resolves.toEqual(paths.map((p) => ({ path: p })))
    expect(calls.filter((c) => c === REFRESH_URL)).toHaveLength(1)
  })

  it('leaves a 401 alone on a request that expects one', async () => {
    const url = `${API_BASE_URL}/auth/login/verify-otp`
    const calls = stubFetch({ [url]: [unauthorized] })

    await expect(
      http.post(url.slice(API_BASE_URL.length), { mobile_number: '0914378064', code: '111002' }, { expect401: true }),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(calls).toEqual([url])
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('leaves a 401 alone on a route of this app’s own, which holds no session', async () => {
    const url = '/api/leads'
    const calls = stubFetch({ [url]: [unauthorized] })

    await expect(http.post(url, { clinic_name: 'x' }, { ownOrigin: true })).rejects.toMatchObject({
      kind: 'unauthorized',
    })
    expect(calls).toEqual([url])
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

/*
 * Fonnus-BE refuses a malformed number as a generic 422 and names the problem
 * only on the field. Read at the top level, the owner would be told to "look at
 * the marked boxes" on a screen with one box and no marks.
 */
describe('a refusal that names its problem on a field', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads as that field’s sentence, not the generic validation line', async () => {
    const url = `${API_BASE_URL}/auth/login`
    stubFetch({
      [url]: [
        () =>
          json(422, {
            status: 422,
            code: 'validation_failed',
            errors: [{ field: 'mobile_number', code: 'invalid_mobile_number' }],
          }),
      ],
    })

    const refused = await http.post('/auth/login', { mobile_number: '0914' }, { expect401: true }).catch((e: unknown) => e)
    expect(fieldMessageFor(refused)).toBe('Số điện thoại chưa đúng. Bạn kiểm tra lại giúp mình nhé.')
  })
})
