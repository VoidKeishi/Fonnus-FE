import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { MAX_BODY_BYTES } from './request-body'
import { ElevenLabsRequestError, handleVoiceDemoToken, type VoiceDemoDeps } from './voice-demo-handler'

/*
 * The route that spends the ElevenLabs key. Anyone can post to it, so it must
 * refuse what another site could send without a preflight, say "switched off"
 * and "ElevenLabs failed" with different statuses, and never let the key or
 * anything ElevenLabs answered reach a visitor or a log. A call gets a WebRTC
 * token and a typed conversation a WebSocket signed URL, and nothing else is
 * asked for.
 */

const CONFIG = { apiKey: 'sk_test_key', agentId: 'agent_test' }
const SIGNED_URL = 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_test&conversation_signature=sig'
const TEXT = JSON.stringify({ input: 'text' })

function post(body: string, contentType = 'application/json'): Request {
  return new Request('http://localhost/api/voice-demo/token', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  })
}

function deps(overrides: Partial<VoiceDemoDeps> = {}): VoiceDemoDeps {
  return {
    config: () => CONFIG,
    mint: vi.fn(() => Promise.resolve('abc')),
    mintSignedUrl: vi.fn(() => Promise.resolve(SIGNED_URL)),
    ...overrides,
  }
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

  it('answers 502 on a failure that is not an ElevenLabs answer, logging only its name', async () => {
    const bug = new TypeError(`unexpected ${CONFIG.apiKey}`)
    const response = await handleVoiceDemoToken(post('{}'), deps({ mint: () => Promise.reject(bug) }))
    expect(response.status).toBe(502)
    expect(await response.text()).toBe('')
    expect(logged).toHaveBeenCalledWith('POST /api/voice-demo/token: ElevenLabs token failed (TypeError)')
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

describe('handleVoiceDemoToken, by input', () => {
  it.each(['{}', '{"input":"voice"}'])('answers a call’s token for %s', async (body) => {
    const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => Promise.resolve(SIGNED_URL))
    const response = await handleVoiceDemoToken(post(body), deps({ mintSignedUrl }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ token: 'abc' })
    expect(mintSignedUrl).not.toHaveBeenCalled()
  })

  it('answers a typed conversation’s signed URL as uncacheable JSON, minting no token', async () => {
    const mint = vi.fn<VoiceDemoDeps['mint']>(() => Promise.resolve('abc'))
    const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => Promise.resolve(SIGNED_URL))
    const response = await handleVoiceDemoToken(post(TEXT), deps({ mint, mintSignedUrl }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ signed_url: SIGNED_URL })
    expect(mintSignedUrl).toHaveBeenCalledWith(CONFIG, expect.any(AbortSignal))
    expect(mint).not.toHaveBeenCalled()
  })

  it.each(['{"input":"x"}', '{"input":null}', '[]', 'null', '"str"'])(
    'refuses %s without calling ElevenLabs',
    async (body) => {
      const mint = vi.fn<VoiceDemoDeps['mint']>(() => Promise.resolve('abc'))
      const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => Promise.resolve(SIGNED_URL))
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
    const mintSignedUrl = vi.fn<VoiceDemoDeps['mintSignedUrl']>(() => Promise.resolve(SIGNED_URL))
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
