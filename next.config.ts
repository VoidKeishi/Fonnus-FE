import type { NextConfig } from 'next';

/*
 * The development proxy, and the only place it exists.
 *
 * `NEXT_PUBLIC_API_BASE_URL` defaults to the relative `/api/v1`, so the browser
 * always talks to this origin and the session cookie stays first-party. In
 * development that path has to reach Fonnus-BE somehow, and a rewrite is the
 * server-side hop that does it without CORS entering the picture at all — the
 * same arrangement ../Fonnus-Web-UI had through Vite's dev proxy.
 *
 * Unset `API_PROXY_TARGET` means no rewrite at all. That is deliberate: a live
 * call then 404s against this app, which is an honest "the backend is not
 * running" rather than a silent fallback to a mock.
 *
 * Production is a different question and is not answered here — see
 * docs/adr/0003-backend-boundary-and-the-api-seam.md.
 */
const proxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  // Every image this app ships is an SVG, which the optimizer passes through
  // untouched anyway. Turning it off removes the optimizer route — and with it
  // the `sharp` question — from whatever we end up deploying.
  images: { unoptimized: true },

  ...(proxyTarget
    ? {
        rewrites: () =>
          Promise.resolve([
            { source: '/api/v1/:path*', destination: `${proxyTarget}/api/v1/:path*` },
          ]),
      }
    : {}),
};

export default nextConfig;
