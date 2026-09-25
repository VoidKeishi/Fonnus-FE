/**
 * Leads, faked in the browser: the landing page's contact form, going nowhere.
 *
 * Nothing is stored. The form validates before it calls, so the mock never
 * sees a number it would reject; `NEXT_PUBLIC_MOCK_FAILURE_RATE` is how the
 * failed-send state is reached.
 */
import type { LeadsApi } from './contracts'
import { delay, maybeFail } from './mock-support'

export const leadsMock: LeadsApi = {
  async submit(_input, opts) {
    await delay(1.4, opts?.signal)
    maybeFail()
  },
}
