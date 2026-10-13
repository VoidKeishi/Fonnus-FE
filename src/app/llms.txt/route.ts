import { renderLlmsTxt } from '@/features/marketing/llms-txt'

/*
 * The file is the same for every request — it is built from `src/data/` — so
 * it is rendered once at build time, like robots.txt and the sitemap, instead
 * of on each fetch: a `GET` handler is dynamic by default since Next.js 15.
 */
export const dynamic = 'force-static'

export function GET(): Response {
  return new Response(renderLlmsTxt(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
