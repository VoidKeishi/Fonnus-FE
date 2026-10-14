/**
 * The API the app uses. Import `api` from here and nothing else.
 *
 * This is the only file that decides between a mock and a live implementation.
 * Both sides of every group are typed against the same interface in
 * `contracts.ts`, so `pnpm typecheck` is what catches a live implementation
 * drifting from the mock it replaces.
 *
 * Switching one group at a time — `NEXT_PUBLIC_API_LIVE_GROUPS=auth` — is
 * deliberate: Fonnus-BE ships endpoints over weeks, and a single global switch
 * would mean the first real endpoint could not be tested until every other one
 * existed.
 *
 * Groups are added here as their screens arrive: `auth`, `leads` and `voice`
 * today. `voice` is always live: a faked conversation is a recording, which is
 * what ADR 0007 removed, so it has no mock and no switch.
 */
import { API_GROUPS } from './contracts';
import type { FonnusApi } from './contracts';
import { API_MODE, HAS_MOCKS, IS_DEV, isLive } from './env';

import { authLive } from './auth.live';
import { authMock } from './auth.mock';
import { leadsLive } from './leads.live';
import { leadsMock } from './leads.mock';
import { voiceLive } from './voice.live';

export const api: FonnusApi = {
  auth: isLive('auth') ? authLive : authMock,
  leads: isLive('leads') ? leadsLive : leadsMock,
  voice: voiceLive,
};

// A one-line reminder in the console, so nobody debugs a mock for an hour
// wondering why their breakpoint in the backend never hits.
if (IS_DEV && HAS_MOCKS) {
  const faked = API_GROUPS.filter((g) => !isLive(g));
  console.info(
    `[fonnus] API mode: ${API_MODE}. Faked in the browser: ${faked.join(', ')}. ` +
      'See .env.example to point a group at the real backend.',
  );
}

export { ApiError, isApiError, isCanceled, messageFor } from './errors';
export type { ApiErrorKind, FieldError } from './errors';
export { setUnauthorizedHandler } from './http';
export { API_MODE, isLive } from './env';
export {
  formatBusinessPhone,
  formatPhone,
  isValidCallbackNumber,
  isValidEmail,
  isValidPhone,
  normalizeCallbackNumber,
  normalizePhone,
  phoneError,
} from './phone';
export { MAX_ADDRESS_LENGTH, MAX_EMAIL_LENGTH, MAX_LOCATIONS, MAX_NAME_LENGTH } from './lead-limits';
export * from './contracts';
