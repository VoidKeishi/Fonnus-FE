import type { MetadataRoute } from 'next'
import { SITEMAP_PATHS, SITE_URL } from '@/data/site'

/**
 * Only the URL per page. `lastModified` is left out because nothing here knows
 * when a page's copy last changed, and a date that is really the build time
 * tells Google the whole site changes on every deploy; `changeFrequency` and
 * `priority` are ignored by Google.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({ url: `${SITE_URL}${path}` }))
}
