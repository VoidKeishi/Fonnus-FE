import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/data/site'

/**
 * Every crawler is welcome, including the AI ones: this is a sales page, and
 * the product is found when ChatGPT, Perplexity or Claude can read it. To keep
 * the page out of model training while staying in their search answers, add a
 * rule per training bot — `GPTBot`, `ClaudeBot`, `Google-Extended` — with
 * `disallow: '/'`; the search bots (`OAI-SearchBot`, `Claude-SearchBot`,
 * Googlebot) are separate user agents and keep the `*` rule.
 *
 * `/app/` is behind the session cookie and renders nothing a crawler can use;
 * `/api/` is four intake handlers and a health check, not pages. Both are
 * disallowed so a bot does not spend its budget, or the rate limit, on them.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/app/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
