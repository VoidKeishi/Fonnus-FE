/**
 * Leads against the real backend. Endpoint and body: `docs/api-contract.md` §6.
 */
import type { LeadsApi } from './contracts'
import { http } from './http'

export const leadsLive: LeadsApi = {
  async submit(input, opts) {
    // Unauthenticated — this is a marketing page, so a 401 must never fire the
    // app's sign-out. Rate-limited by IP server-side; a CAPTCHA here costs more
    // leads than it saves.
    await http.post(
      '/leads',
      { ...input, source: 'landing_contact' },
      { signal: opts?.signal, expect401: true, parse: 'none' },
    )
  },
}
