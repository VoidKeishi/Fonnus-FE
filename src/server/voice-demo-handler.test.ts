import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { MAX_BODY_BYTES } from './request-body'
import { charge, COOKIE_NAME, decodeCookie, encodeCookie, HOUR_BUDGET_MS, WINDOW_MS } from './voice-demo-budget'
import type { ConversationPage, ConversationRow, Ledger } from './voice-demo-budget'
import {
  ElevenLabsRequestError,
  handleVoiceDemoBudget,
  handleVoiceDemoToken,
  remoteIpFrom,
  TurnstileRequestError,
  type VoiceDemoDeps,
} from './voice-demo-handler'

/*
 * The route that spends the ElevenLabs key. Anyone can post to it, so it must
 * refuse what another site could send without a preflight, say "switched off"
 * and "ElevenLabs failed" with different statuses, and never let the key or
 * anything ElevenLabs answered reach a visitor or a log. A call gets a WebRTC
 * token and a typed conversation a WebSocket signed URL, and nothing else is
 * asked for. And since the server keeps the visitor's hour, it must refuse a
 * ticket when the hour is spent, never charge for one it did not mint, and
 * keep answering when ElevenLabs's list cannot say what to refund. And since
 * a script without the cookie is a fresh hour, every ticket costs a Turnstile
 * token Cloudflare accepts: without one the route asks nobody anything,
 * Cloudflare failing is no ticket, and the token never reaches a log.
 */

const CONFIG = {
  apiKey: 'sk_test_key',
  agentId: 'agent_test',
  cookieSecret: 'test-secret-0123456789abcdef',
  secureCookie: true,
  turnstileSecret: '0x4AAAAAAAturnstile-secret',
}
const SIGNED_URL = 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_test&conversation_signature=sig'
/** A Turnstile token as the widget hands it over: what every ticket costs. */
const PROOF = '0.zTurnstileProofForTheTokenRoute'
const CALL = JSON.stringify({ turnstile_token: PROOF })
const TEXT = JSON.stringify({ input: 'text', turnstile_token: PROOF })
const NOW = Date.UTC(2026, 9, 18, 2, 0, 0)

function post(body: string, contentType = 'application/json', cookie?: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/voice-demo/token', {
    method: 'POST',
    headers: { 'Content-Type': contentType, ...(cookie === undefined ? {} : { Cookie: cookie }), ...headers },
    body,
  })
}

function get(cookie?: string): Request {
  return new Request('http://localhost/api/voice-demo/budget', cookie === undefined ? {} : { headers: { Cookie: cookie } })
}

const page = (...rows: ConversationRow[]): ConversationPage => ({ rows, complete: true })

const minted = (ticket: string, conversationId: string | null = 'conv_1') => Promise.resolve({ ticket, conversationId })

function deps(overrides: Partial<VoiceDemoDeps> = {}): VoiceDemoDeps {
  return {
    config: () => CONFIG,
    mint: vi.fn(() => minted('abc')),
    mintSignedUrl: vi.fn(() => minted(SIGNED_URL, null)),
    listConversations: vi.fn(() => Promise.resolve(page())),
    verifyTurnstile: vi.fn(() => Promise.resolve({ ok: true as const })),
    now: () => NOW,
    ...overrides,
  }
}

/** The `Cookie` request header a browser sends back after the response's `Set-Cookie`. */
function cookieFrom(response: Response): string {
  return (response.headers.get('set-cookie') ?? '').split('; ')[0] ?? ''
}

/** The ledger a `Set-Cookie` carries, read with the route's own secret. */
function ledgerFrom(response: Response): Ledger | null {
  return decodeCookie(cookieFrom(response).slice(COOKIE_NAME.length + 1), CONFIG.cookieSecret)
}

/** A browser whose first ticket of the hour, `conv_1`, was minted `ago` milliseconds before now. */
function chargedCookie(ago = 60_000): string {
  return `${COOKIE_NAME}=${encodeCookie(charge(null, 'conv_1', NOW - ago).ledger, CONFIG.cookieSecret)}`
}

let logged: MockInstance<typeof console.error>

beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleVoiceDemoToken', () => {
  it('refuses text/plain, which another site can send without a preflight', async () => {
    const response = await handleVoiceDemoToken(post(CALL, 'text/plain'), deps())
    expect(response.status).toBe(415)
  })

  it('refuses a JSON request whose body does not parse', async () => {
    const response = await handleVoiceDemoToken(post('{not json'), deps())
    expect(response.status).toBe(400)
  })

  it('answers 503 without calling ElevenLabs when the variables are unset', async () => {
    const mint = vi.fn<VoiceDemoDeps['mint']>(() => minted('abc'))
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() => Promise.resolve(page()))
    const response = await handleVoiceDemoToken(
      post(CALL, 'application/json', chargedCookie()),
      deps({ config: () => null, mint, listConversations }),
    )
    expect(response.status).toBe(503)
    expect(mint).not.toHaveBeenCalled()
    expect(listConversations).not.toHaveBeenCalled()
  })

  it('answers a bare 502 when ElevenLabs refuses, logging its status and not the key', async () => {
    const refused = new ElevenLabsRequestError('token', 401)
    const response = await handleVoiceDemoToken(post(CALL), deps({ mint: () => Promise.reject(refused) }))
    expect(response.status).toBe(502)
    const text = await response.text()
    expect(text).toBe('')
    expect(text).not.toContain(refused.message)
    expect(logged).toHaveBeenCalledWith('POST /api/voice-demo/token: ElevenLabs token failed, upstream status 401')
    expect(JSON.stringify(logged.mock.calls)).not.toContain(CONFIG.apiKey)
  })

  it('answers 502 on a failure that is not an ElevenLabs answer, logging only its name', async () => {
    const bug = new TypeError(`unexpected ${CONFIG.apiKey}`)
    const response = await handleVoiceDemoToken(post(CALL), deps({ mint: () => Promise.reject(bug) }))
    expect(response.status).toBe(502)
    expect(await response.text()).toBe('')
    expect(logged).toHaveBeenCalledWith('POST /api/voice-demo/token: ElevenLabs token failed (TypeError)')
    expect(JSON.stringify(logged.mock.calls)).not.toContain(CONFIG.apiKey)
  })

  it('answers 502 when ElevenLabs does not answer in time', async () => {
    const timedOut = new ElevenLabsRequestError('token', null, { cause: new DOMException('timed out', 'TimeoutError') })
    const response = await handleVoiceDemoToken(post(CALL), deps({ mint: () => Promise.reject(timedOut) }))
    expect(response.status).toBe(502)
    expect(logged).toHaveBeenCalledWith('POST /api/voice-demo/token: ElevenLabs token failed, upstream status TimeoutError')
  })

  it('answers the token as uncacheable JSON', async () => {
    const response = await handleVoiceDemoToken(post(CALL), deps())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ token: 'abc', remaining_ms: HOUR_BUDGET_MS, resets_at: NOW + WINDOW_MS })
  })

  it('gives ElevenLabs the configuration and a deadline', async () => {
    const mint = vi.fn<VoiceDemoDeps['mint']>(() => minted('abc'))
    await handleVoiceDemoToken(post(CALL), deps({ mint }))
    expect(mint).toHaveBeenCalledWith(CONFIG, expect.any(AbortSignal))
  })
})

describe('handleVoiceDemoToken, by input', () => {
  it.each([CALL, JSON.stringify({ input: 'voice', turnstile_token: PROOF })])('answers a call’s token for %s', async (body) => {
    const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => minted(SIGNED_URL))
    const response = await handleVoiceDemoToken(post(body), deps({ mintSignedUrl }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ token: 'abc' })
    expect(mintSignedUrl).not.toHaveBeenCalled()
  })

  it('answers a typed conversation’s signed URL as uncacheable JSON, minting no token', async () => {
    const mint = vi.fn<VoiceDemoDeps['mint']>(() => minted('abc'))
    const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => minted(SIGNED_URL))
    const response = await handleVoiceDemoToken(post(TEXT), deps({ mint, mintSignedUrl }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ signed_url: SIGNED_URL })
    expect(mintSignedUrl).toHaveBeenCalledWith(CONFIG, expect.any(AbortSignal))
    expect(mint).not.toHaveBeenCalled()
  })

  it.each(['{"input":"x"}', '{"input":null}', '[]', 'null', '"str"'])(
    'refuses %s without calling ElevenLabs',
    async (body) => {
      const mint = vi.fn<VoiceDemoDeps['mint']>(() => minted('abc'))
      const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => minted(SIGNED_URL))
      const response = await handleVoiceDemoToken(post(body), deps({ mint, mintSignedUrl }))
      expect(response.status).toBe(400)
      expect(mint).not.toHaveBeenCalled()
      expect(mintSignedUrl).not.toHaveBeenCalled()
    },
  )

  it('refuses a typed conversation sent as text/plain, and one over the size cap', async () => {
    expect((await handleVoiceDemoToken(post(TEXT, 'text/plain'), deps())).status).toBe(415)
    const padded = JSON.stringify({ input: 'text', pad: 'x'.repeat(MAX_BODY_BYTES) })
    expect((await handleVoiceDemoToken(post(padded), deps())).status).toBe(413)
  })

  it('answers 503 to a typed conversation without calling ElevenLabs when the variables are unset', async () => {
    const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => minted(SIGNED_URL))
    const response = await handleVoiceDemoToken(post(TEXT), deps({ config: () => null, mintSignedUrl }))
    expect(response.status).toBe(503)
    expect(mintSignedUrl).not.toHaveBeenCalled()
  })

  it('answers a bare 502 when ElevenLabs refuses a signed URL, logging the step and status only', async () => {
    const refused = new ElevenLabsRequestError('signed-url', 403)
    const response = await handleVoiceDemoToken(post(TEXT), deps({ mintSignedUrl: () => Promise.reject(refused) }))
    expect(response.status).toBe(502)
    expect(await response.text()).toBe('')
    expect(logged).toHaveBeenCalledWith('POST /api/voice-demo/token: ElevenLabs signed-url failed, upstream status 403')
    expect(JSON.stringify(logged.mock.calls)).not.toContain(CONFIG.apiKey)
  })

  it('names the signed-url step when the failure is not an ElevenLabs answer', async () => {
    const bug = new TypeError(`unexpected ${SIGNED_URL}`)
    const response = await handleVoiceDemoToken(post(TEXT), deps({ mintSignedUrl: () => Promise.reject(bug) }))
    expect(response.status).toBe(502)
    expect(logged).toHaveBeenCalledWith('POST /api/voice-demo/token: ElevenLabs signed-url failed (TypeError)')
    expect(JSON.stringify(logged.mock.calls)).not.toContain(SIGNED_URL)
  })
})

describe('handleVoiceDemoToken, the hour', () => {
  it('charges a first ticket the whole hour, and sets the cookie that keeps it', async () => {
    const response = await handleVoiceDemoToken(post(CALL), deps())
    expect(await response.json()).toEqual({ token: 'abc', remaining_ms: 175_000, resets_at: NOW + WINDOW_MS })
    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie.startsWith(`${COOKIE_NAME}=`)).toBe(true)
    expect(cookie).toContain('; Path=/api/voice-demo;')
    expect(cookie).toContain('; HttpOnly; Secure; SameSite=Lax')
    const maxAge = Number(/Max-Age=(\d+)/.exec(cookie)?.[1])
    expect(maxAge).toBeGreaterThan(0)
    expect(maxAge).toBeLessThanOrEqual(3600)
    expect(ledgerFrom(response)?.entries).toEqual([{ id: 'conv_1', at: NOW, ms: HOUR_BUDGET_MS }])
  })

  it('refuses a second ticket while the first is still charged, minting nothing', async () => {
    const first = await handleVoiceDemoToken(post(CALL), deps())
    const mint = vi.fn<VoiceDemoDeps['mint']>(() => minted('def'))
    const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => minted(SIGNED_URL))
    const response = await handleVoiceDemoToken(
      post(CALL, 'application/json', cookieFrom(first)),
      deps({ mint, mintSignedUrl, now: () => NOW + 30_000 }),
    )
    expect(response.status).toBe(429)
    expect(response.headers.get('content-type')).toBe('application/problem+json')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ code: 'budget_spent', resets_at: NOW + WINDOW_MS })
    expect(ledgerFrom(response)).toEqual(ledgerFrom(first))
    expect(mint).not.toHaveBeenCalled()
    expect(mintSignedUrl).not.toHaveBeenCalled()
  })

  it('refunds what the first call did not use once ElevenLabs has finished with it', async () => {
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() =>
      Promise.resolve(page({ conversation_id: 'conv_1', status: 'done', call_duration_secs: 20 })),
    )
    const response = await handleVoiceDemoToken(
      post(CALL, 'application/json', chargedCookie()),
      deps({ mint: () => minted('def', 'conv_2'), listConversations }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ token: 'def', remaining_ms: 155_000, resets_at: NOW - 60_000 + WINDOW_MS })
    expect(listConversations).toHaveBeenCalledWith(CONFIG, Math.floor((NOW - 60_000) / 1000), expect.any(AbortSignal))
    expect(ledgerFrom(response)?.entries).toEqual([
      { id: 'conv_1', at: NOW - 60_000, ms: 20_000 },
      { id: 'conv_2', at: NOW, ms: 155_000 },
    ])
  })

  it('answers from the charges as they stand when the list fails, logging only the step and status', async () => {
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() =>
      Promise.reject(new ElevenLabsRequestError('conversations', 500)),
    )
    const mint = vi.fn<VoiceDemoDeps['mint']>(() => minted('def'))
    const cookie = chargedCookie()
    const response = await handleVoiceDemoToken(post(CALL, 'application/json', cookie), deps({ mint, listConversations }))
    expect(response.status).toBe(429)
    expect(mint).not.toHaveBeenCalled()
    expect(logged.mock.calls).toEqual([['POST /api/voice-demo/token: ElevenLabs conversations failed, upstream status 500']])
  })

  it('charges nothing, and leaves the cookie alone, when ElevenLabs refuses the ticket', async () => {
    const refused = new ElevenLabsRequestError('token', 500)
    const response = await handleVoiceDemoToken(post(CALL), deps({ mint: () => Promise.reject(refused) }))
    expect(response.status).toBe(502)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('reads a tampered cookie as none: the full budget, without asking ElevenLabs', async () => {
    const cookie = chargedCookie()
    const tampered = `${cookie.slice(0, -1)}${cookie.endsWith('A') ? 'B' : 'A'}`
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() => Promise.resolve(page()))
    const response = await handleVoiceDemoToken(post(CALL, 'application/json', tampered), deps({ listConversations }))
    expect(await response.json()).toMatchObject({ remaining_ms: HOUR_BUDGET_MS })
    expect(listConversations).not.toHaveBeenCalled()
  })

  it('charges a typed conversation that came with no conversation id, for the fifteen-minute rule to refund', async () => {
    const response = await handleVoiceDemoToken(post(TEXT), deps())
    expect(await response.json()).toEqual({ signed_url: SIGNED_URL, remaining_ms: HOUR_BUDGET_MS, resets_at: NOW + WINDOW_MS })
    expect(ledgerFrom(response)?.entries).toEqual([{ id: null, at: NOW, ms: HOUR_BUDGET_MS }])
  })
})

describe('handleVoiceDemoBudget', () => {
  it('gives a browser with no cookie the full hour without asking ElevenLabs', async () => {
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() => Promise.resolve(page()))
    const response = await handleVoiceDemoBudget(get(), deps({ listConversations }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(await response.json()).toEqual({ remaining_ms: HOUR_BUDGET_MS, resets_at: null })
    expect(listConversations).not.toHaveBeenCalled()
  })

  it('settles the hour and writes the cookie back', async () => {
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() =>
      Promise.resolve(page({ conversation_id: 'conv_1', status: 'processing', call_duration_secs: 40 })),
    )
    const response = await handleVoiceDemoBudget(get(chargedCookie()), deps({ listConversations }))
    expect(await response.json()).toEqual({ remaining_ms: 135_000, resets_at: NOW - 60_000 + WINDOW_MS })
    expect(ledgerFrom(response)?.entries).toEqual([{ id: 'conv_1', at: NOW - 60_000, ms: 40_000 }])
  })

  it('says the hour is spent while the call is still in progress', async () => {
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() =>
      Promise.resolve(page({ conversation_id: 'conv_1', status: 'in-progress', call_duration_secs: 40 })),
    )
    const response = await handleVoiceDemoBudget(get(chargedCookie()), deps({ listConversations }))
    expect(await response.json()).toEqual({ remaining_ms: 0, resets_at: NOW - 60_000 + WINDOW_MS })
  })

  it('leaves the cookie alone when settling changed no charge, so it cannot overwrite a ticket’s', async () => {
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() =>
      Promise.resolve(page({ conversation_id: 'conv_1', status: 'in-progress', call_duration_secs: 40 })),
    )
    const response = await handleVoiceDemoBudget(get(chargedCookie()), deps({ listConversations }))
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('writes the settled ledger back when a refund changed it', async () => {
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() =>
      Promise.resolve(page({ conversation_id: 'conv_1', status: 'done', call_duration_secs: 15 })),
    )
    const response = await handleVoiceDemoBudget(get(chargedCookie()), deps({ listConversations }))
    expect(response.headers.get('set-cookie')).toContain('; HttpOnly; Secure; SameSite=Lax')
    expect(ledgerFrom(response)).toEqual({ v: 1, windowStart: NOW - 60_000, entries: [{ id: 'conv_1', at: NOW - 60_000, ms: 15_000 }] })
  })

  it('answers from the charges as they stand when the list fails, logging only the step and status', async () => {
    const timedOut = new ElevenLabsRequestError('conversations', null, { cause: new DOMException('timed out', 'TimeoutError') })
    const cookie = chargedCookie()
    const response = await handleVoiceDemoBudget(get(cookie), deps({ listConversations: () => Promise.reject(timedOut) }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ remaining_ms: 0, resets_at: NOW - 60_000 + WINDOW_MS })
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(logged.mock.calls).toEqual([['GET /api/voice-demo/budget: ElevenLabs conversations failed, upstream status TimeoutError']])
    expect(JSON.stringify(logged.mock.calls)).not.toContain(cookie.slice(COOKIE_NAME.length + 1, COOKIE_NAME.length + 20))
  })

  it('reads a cookie from an hour that has ended as none', async () => {
    const response = await handleVoiceDemoBudget(get(chargedCookie(WINDOW_MS)), deps())
    expect(await response.json()).toEqual({ remaining_ms: HOUR_BUDGET_MS, resets_at: null })
  })

  it('answers 503 without calling ElevenLabs when the variables are unset', async () => {
    const listConversations = vi.fn<VoiceDemoDeps['listConversations']>(() => Promise.resolve(page()))
    const verifyTurnstile = vi.fn<VoiceDemoDeps['verifyTurnstile']>(() => Promise.resolve({ ok: true }))
    const response = await handleVoiceDemoBudget(
      get(chargedCookie()),
      deps({ config: () => null, listConversations, verifyTurnstile }),
    )
    expect(response.status).toBe(503)
    expect(listConversations).not.toHaveBeenCalled()
    expect(verifyTurnstile).not.toHaveBeenCalled()
  })

  it('asks for no Turnstile token: reading the hour mints nothing', async () => {
    const verifyTurnstile = vi.fn<VoiceDemoDeps['verifyTurnstile']>(() => Promise.resolve({ ok: false, codes: [] }))
    const response = await handleVoiceDemoBudget(get(chargedCookie()), deps({ verifyTurnstile }))
    expect(response.status).toBe(200)
    expect(verifyTurnstile).not.toHaveBeenCalled()
  })
})

describe('handleVoiceDemoToken, the Turnstile check', () => {
  type Verdict = Awaited<ReturnType<VoiceDemoDeps['verifyTurnstile']>>

  /** Every upstream call the route can make, so a test can say which were made. */
  function upstream(verdict: () => Promise<Verdict> = () => Promise.resolve({ ok: true })) {
    return {
      verifyTurnstile: vi.fn<VoiceDemoDeps['verifyTurnstile']>(verdict),
      listConversations: vi.fn<VoiceDemoDeps['listConversations']>(() => Promise.resolve(page())),
      mint: vi.fn<VoiceDemoDeps['mint']>(() => minted('abc')),
      mintSignedUrl: vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => minted(SIGNED_URL)),
    }
  }

  function expectNothingAfterSiteverify(calls: ReturnType<typeof upstream>): void {
    expect(calls.listConversations).not.toHaveBeenCalled()
    expect(calls.mint).not.toHaveBeenCalled()
    expect(calls.mintSignedUrl).not.toHaveBeenCalled()
  }

  it.each([
    ['no token', '{}'],
    ['a typed conversation with no token', '{"input":"text"}'],
    ['an empty token', '{"turnstile_token":""}'],
    ['a token that is not a string', '{"turnstile_token":42}'],
    ['a null token', '{"turnstile_token":null}'],
  ])('refuses %s with a bare 403, asking neither Cloudflare nor ElevenLabs', async (_, body) => {
    const calls = upstream()
    const response = await handleVoiceDemoToken(post(body, 'application/json', chargedCookie()), deps(calls))
    expect(response.status).toBe(403)
    expect(await response.text()).toBe('')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(calls.verifyTurnstile).not.toHaveBeenCalled()
    expectNothingAfterSiteverify(calls)
  })

  it('asks Cloudflare with the secret, the token, the visitor’s address and the deadline', async () => {
    const calls = upstream()
    const response = await handleVoiceDemoToken(
      post(CALL, 'application/json', undefined, { 'X-Forwarded-For': '203.113.135.7, 10.0.0.1' }),
      deps(calls),
    )
    expect(response.status).toBe(200)
    expect(calls.verifyTurnstile).toHaveBeenCalledWith(CONFIG.turnstileSecret, PROOF, '203.113.135.7', expect.any(AbortSignal))
  })

  it('asks Cloudflare without an address when the request carries none', async () => {
    const calls = upstream()
    await handleVoiceDemoToken(post(TEXT), deps(calls))
    expect(calls.verifyTurnstile).toHaveBeenCalledWith(CONFIG.turnstileSecret, PROOF, null, expect.any(AbortSignal))
  })

  it('refuses a token Cloudflare refused before reading the hour, logging its codes and never the token', async () => {
    const calls = upstream(() => Promise.resolve({ ok: false, codes: ['invalid-input-response'] }))
    // A spent hour: the refusal comes first, without the list call that would find that out.
    const response = await handleVoiceDemoToken(post(CALL, 'application/json', chargedCookie()), deps(calls))
    expect(response.status).toBe(403)
    expect(await response.text()).toBe('')
    expect(response.headers.get('set-cookie')).toBeNull()
    expectNothingAfterSiteverify(calls)
    expect(logged.mock.calls).toEqual([['POST /api/voice-demo/token: Turnstile refused: invalid-input-response']])
    expect(JSON.stringify(logged.mock.calls)).not.toContain(PROOF)
  })

  it('names every code Cloudflare gave for a refusal', async () => {
    const calls = upstream(() => Promise.resolve({ ok: false, codes: ['timeout-or-duplicate', 'internal-error'] }))
    const response = await handleVoiceDemoToken(post(TEXT), deps(calls))
    expect(response.status).toBe(403)
    expect(logged.mock.calls).toEqual([['POST /api/voice-demo/token: Turnstile refused: timeout-or-duplicate,internal-error']])
  })

  it('answers a bare 502 when siteverify fails, logging the step and Cloudflare’s status only', async () => {
    const calls = upstream(() => Promise.reject(new TurnstileRequestError(500)))
    const response = await handleVoiceDemoToken(post(CALL), deps(calls))
    expect(response.status).toBe(502)
    expect(await response.text()).toBe('')
    expect(response.headers.get('set-cookie')).toBeNull()
    expectNothingAfterSiteverify(calls)
    expect(logged.mock.calls).toEqual([['POST /api/voice-demo/token: Turnstile siteverify failed, upstream status 500']])
    expect(JSON.stringify(logged.mock.calls)).not.toContain(PROOF)
    expect(JSON.stringify(logged.mock.calls)).not.toContain(CONFIG.turnstileSecret)
  })

  it('answers 502 when Cloudflare does not answer in time', async () => {
    const timedOut = new TurnstileRequestError(null, { cause: new DOMException('timed out', 'TimeoutError') })
    const calls = upstream(() => Promise.reject(timedOut))
    const response = await handleVoiceDemoToken(post(TEXT), deps(calls))
    expect(response.status).toBe(502)
    expectNothingAfterSiteverify(calls)
    expect(logged.mock.calls).toEqual([['POST /api/voice-demo/token: Turnstile siteverify failed, upstream status TimeoutError']])
  })

  it('answers 502 on a failure that is not a siteverify answer, logging only its name', async () => {
    const calls = upstream(() => Promise.reject(new TypeError(`unexpected ${PROOF}`)))
    const response = await handleVoiceDemoToken(post(CALL), deps(calls))
    expect(response.status).toBe(502)
    expectNothingAfterSiteverify(calls)
    expect(logged.mock.calls).toEqual([['POST /api/voice-demo/token: Turnstile siteverify failed (TypeError)']])
    expect(JSON.stringify(logged.mock.calls)).not.toContain(PROOF)
  })

  it('answers 503 without asking Cloudflare when the variables are unset', async () => {
    const calls = upstream()
    const response = await handleVoiceDemoToken(post(CALL), deps({ ...calls, config: () => null }))
    expect(response.status).toBe(503)
    expect(calls.verifyTurnstile).not.toHaveBeenCalled()
    expectNothingAfterSiteverify(calls)
  })
})

describe('remoteIpFrom', () => {
  const from = (forwarded?: string) =>
    remoteIpFrom(new Headers(forwarded === undefined ? {} : { 'x-forwarded-for': forwarded }))

  it('is null when the request names no address', () => {
    expect(from()).toBeNull()
  })

  it('takes the one address there is', () => {
    expect(from('1.2.3.4')).toBe('1.2.3.4')
  })

  it('takes the first of a list, trimmed: the visitor, not the proxies after it', () => {
    expect(from(' 1.2.3.4, 10.0.0.1')).toBe('1.2.3.4')
  })

  it.each([', 1.2.3.4', '', '   '])('is null when the first entry is blank: "%s"', (forwarded) => {
    expect(from(forwarded)).toBeNull()
  })
})
