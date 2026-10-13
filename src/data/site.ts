/**
 * The site as a crawler sees it: the production origin and the pages that are
 * meant to be found. Read by the root layout (`metadataBase`), `robots.ts` and
 * `sitemap.ts`, so the three never disagree about the domain.
 *
 * The origin is the production domain written out, never the deployment's own
 * host: a preview on `*.vercel.app` must still point every absolute URL —
 * share image, canonical, sitemap — at `fonnus.ai`, or a crawler that finds the
 * preview indexes a second copy of the site.
 */
export const SITE_URL = 'https://fonnus.ai'

/**
 * The pages the sitemap lists: public, indexable, and built. `/dang-ky` joins
 * when it stops being a placeholder; the two legal pages join when their text
 * is published and their `noindex` is removed (PLAN.md §Backlog). `/dang-nhap`
 * is a door, reached from the header; a search result for it sells nothing.
 */
export const SITEMAP_PATHS = ['/', '/cham-diem-hotline'] as const
