/**
 * Leads over HTTP, received by this app's own route handlers and appended to
 * the leads spreadsheet (ADR 0005) — not by Fonnus-BE. Paths and bodies:
 * `docs/api-contract.md` §6.
 *
 * `ownOrigin` keeps both calls on this origin whatever `API_BASE_URL` says,
 * because in production that is Fonnus-BE's.
 */
import type { LeadsApi } from './contracts'
import { http } from './http'

export const leadsLive: LeadsApi = {
  async submit(input, opts) {
    // Unauthenticated — this is a marketing page, so a 401 must never fire the
    // app's sign-out. Rate-limited by IP at the host's firewall; a CAPTCHA here
    // costs more leads than it saves.
    await http.post(
      '/api/leads',
      { ...input, source: 'landing_contact' },
      { signal: opts?.signal, expect401: true, parse: 'none', ownOrigin: true },
    )
  },

  async requestHotlineReport(input, opts) {
    // Same terms as the contact form: unauthenticated, rate-limited by IP at the firewall.
    await http.post(
      '/api/leads/hotline-report',
      { ...input, source: 'hotline_report' },
      { signal: opts?.signal, expect401: true, parse: 'none', ownOrigin: true },
    )
  },
}
