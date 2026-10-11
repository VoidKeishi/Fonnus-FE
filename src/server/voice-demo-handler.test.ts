import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { ElevenLabsRequestError, handleVoiceDemoToken, type VoiceDemoDeps } from './voice-demo-handler'

/*
 * The route that spends the ElevenLabs key. Anyone can post to it, so it must
 * refuse what another site could send without a preflight, say "switched off"
 * and "ElevenLabs failed" with different statuses, and never let the key or
 * anything ElevenLabs answered reach a visitor or a log.
 */

const CONFIG = { apiKey: 'sk_test_key', agentId: 'agent_test' }

function post(body: string, contentType = 'application/json'): Request {
  return new Request('http://localhost/api/voice-demo/token', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  })
}

function deps(overrides: Partial<VoiceDemoDeps> = {}): VoiceDemoDeps {
  return { config: () => CONFIG, mint: vi.fn(() => Promise.resolve('abc')), ...overrides }
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
    const response = await handleVoiceDemoToken(post('{}', 'text/plain'), deps())
    expect(response.status).toBe(415)
  })

  it('refuses a JSON request whose body does not parse', async () => {
    const response = await handleVoiceDemoToken(post('{not json'), deps())
    expect(response.status).toBe(400)
  })

  it('answers 503 without calling ElevenLabs when the variables are unset', async () => {
    const mint = vi.fn(() => Promise.resolve('abc'))
    const response = await handleVoiceDemoToken(post('{}'), deps({ config: () => null, mint }))
    expect(response.status).toBe(503)
    expect(mint).not.toHaveBeenCalled()
  })

  it('answers a bare 502 when ElevenLabs refuses, logging its status and not the key', async () => {
    const refused = new ElevenLabsRequestError('token', 401)
    const response = await handleVoiceDemoToken(post('{}'), deps({ mint: () => Promise.reject(refused) }))
    expect(response.status).toBe(502)
    const text = await response.text()
    expect(text).toBe('')
    expect(text).not.toContain(refused.message)
    expect(logged).toHaveBeenCalledWith('POST /api/voice-demo/token: ElevenLabs token failed, upstream status 401')
    expect(JSON.stringify(logged.mock.calls)).not.toContain(CONFIG.apiKey)
  })

  it('answers 502 when ElevenLabs does not answer in time', async () => {
    const timedOut = new ElevenLabsRequestError('token', null, { cause: new DOMException('timed out', 'TimeoutError') })
    const response = await handleVoiceDemoToken(post('{}'), deps({ mint: () => Promise.reject(timedOut) }))
    expect(response.status).toBe(502)
    expect(logged).toHaveBeenCalledWith('POST /api/voice-demo/token: ElevenLabs token failed, upstream status TimeoutError')
  })

  it('answers the token as uncacheable JSON', async () => {
    const response = await handleVoiceDemoToken(post('{}'), deps())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ token: 'abc' })
  })

  it('gives ElevenLabs the configuration and a deadline', async () => {
    const mint = vi.fn<VoiceDemoDeps['mint']>(() => Promise.resolve('abc'))
    await handleVoiceDemoToken(post('{}'), deps({ mint }))
    expect(mint).toHaveBeenCalledWith(CONFIG, expect.any(AbortSignal))
  })
})
