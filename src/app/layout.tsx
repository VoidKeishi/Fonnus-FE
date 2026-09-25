import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Baloo_2, Be_Vietnam_Pro, IBM_Plex_Sans } from 'next/font/google';
import { SessionProvider } from '@/session/session-provider';
import './globals.css';

/*
 * The three faces of the design system (ADR 0002 point 2), loaded by next/font
 * rather than by the Web-UI's Google Fonts @import: self-hosted at build time,
 * no render-blocking request to a third party. The `vietnamese` subset is the
 * reason these faces were chosen — without it every accented glyph falls back
 * to a system font mid-word, which on a page that is entirely Vietnamese is not
 * a detail. Weights are those of ../Fonnus-Web-UI/src/styles/tokens/fonts.css.
 */
const baloo = Baloo_2({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-baloo',
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-be-vietnam',
});

const plex = IBM_Plex_Sans({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-plex',
});

/*
 * Metadata is the one place in this repo where Vietnamese and English meet: the
 * title and description are read by a person, so they follow the rule every
 * other user-facing string follows (CLAUDE.md §Ground rules) and are Vietnamese.
 */
export const metadata: Metadata = {
  title: {
    default: 'Fonnus — Lễ tân AI cho phòng khám',
    template: '%s · Fonnus',
  },
  description:
    'Fonnus nghe và trả lời cuộc gọi đến cho phòng khám, 24/7, bằng tiếng Việt. Không cuộc gọi nào bị bỏ lỡ.',
};

/*
 * The one literal colour in the app. `themeColor` is read by the browser before
 * any stylesheet loads — it paints the phone's address bar — so it cannot be a
 * `var()`. It is `--paper` from colors.css; change it there and here together.
 */
export const viewport: Viewport = {
  themeColor: '#F7EFE1',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  /*
   * `lang="vi"` is load-bearing, not decoration: it is what makes a screen
   * reader pronounce the page in Vietnamese and what lets the browser hyphenate
   * and select text correctly.
   *
   * No dark mode. colors.css defines a `[data-theme="dark"]` palette and the
   * product has never switched it on (CONTEXT.md §Look and feel) — the warm
   * cream ground is the page, on every screen.
   *
   * `data-scroll-behavior="smooth"` pairs with `scroll-behavior: smooth` in
   * globals.css: it tells Next.js to switch smooth scrolling off during a route
   * change, so a new page starts at its top instantly while an in-page anchor
   * still glides.
   */
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={`h-full ${baloo.variable} ${beVietnam.variable} ${plex.variable}`}
    >
      {/*
        SessionProvider wraps everything, including the landing page: it probes
        `GET /me` once at boot, and a signed-in owner arriving on the landing
        page should see the door they can already walk through rather than a
        second sign-in prompt. It is a client component, which does not make the
        pages inside it client components — they are passed through as children.
      */}
      <body className="min-h-full">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
