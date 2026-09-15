/**
 * The only file in the app that reads `process.env`, enforced by a lint rule
 * (`eslint.config.mjs`).
 *
 * Two Next.js rules shape this file. Only a variable prefixed `NEXT_PUBLIC_` is
 * available in the browser at all, and only a *literal*
 * `process.env.NEXT_PUBLIC_X` is replaced at build time — read through a
 * computed key it is `undefined` in the browser and defined on the server,
 * which is the worst kind of bug to find later. So every name below is written
 * out in full, once.
 *
 * Nothing here is secret: all of it is inlined into the JavaScript the browser
 * downloads. See `.env.example` for what each variable does.
 */
import { API_GROUPS } from './contracts';
import type { ApiGroup } from './contracts';

/** `mock` (default) fakes everything in the browser; `live` makes real requests. */
export const API_MODE: 'mock' | 'live' =
  process.env.NEXT_PUBLIC_API_MODE === 'live' ? 'live' : 'mock';

export const API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'
).replace(/\/+$/, '');

/**
 * Groups forced live while the rest stay mocked.
 *
 * Fonnus-BE will ship endpoints one at a time over weeks. A single global
 * switch would mean the first real endpoint cannot be tested until every other
 * one exists, so `NEXT_PUBLIC_API_LIVE_GROUPS=tenant` is the difference between
 * integrating incrementally and integrating in one terrifying step.
 */
const LIVE_GROUPS: ReadonlySet<ApiGroup> = new Set(
  (process.env.NEXT_PUBLIC_API_LIVE_GROUPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is ApiGroup => (API_GROUPS as readonly string[]).includes(s)),
);

export function isLive(group: ApiGroup): boolean {
  return API_MODE === 'live' || LIVE_GROUPS.has(group);
}

function num(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** How long the mock pretends the network takes. Set to 0 for a snappy demo. */
export const MOCK_LATENCY_MS = Math.max(
  0,
  num(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS, 450),
);

/**
 * Fraction of mock requests that fail, 0..1.
 *
 * Not decoration: the loading, rollback and retry paths cannot be reached in
 * mock mode any other way, so this is the only way to look at them before a
 * backend exists. Set it to 1 and walk the app.
 */
export const MOCK_FAILURE_RATE = Math.min(
  1,
  Math.max(0, num(process.env.NEXT_PUBLIC_MOCK_FAILURE_RATE, 0)),
);

/** True when at least one group is still faked — used for a dev-only warning. */
export const HAS_MOCKS: boolean = API_GROUPS.some((g) => !isLive(g));

/**
 * Development build. Lives here because `env.ts` is the one door to
 * `process.env` (`eslint.config.mjs`), and `NODE_ENV` is no exception even
 * though Next.js sets it rather than a `.env` file.
 */
export const IS_DEV: boolean = process.env.NODE_ENV !== 'production';
