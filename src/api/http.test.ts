import { describe, expect, it } from 'vitest'
import { API_BASE_URL } from './env'
import { buildUrl } from './http'

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
