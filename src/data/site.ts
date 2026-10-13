/**
 * The site as a crawler sees it: the production origin, the name and the two
 * sentences that describe the product, and the pages that are meant to be
 * found. Read by the root layout (`metadataBase`, the title, the description),
 * `robots.ts`, `sitemap.ts` and the `llms.txt` route, so none of them can
 * describe a different site from the others.
 *
 * The origin is the production domain written out, never the deployment's own
 * host: a preview on `*.vercel.app` must still point every absolute URL —
 * share image, canonical, sitemap — at `fonnus.ai`, or a crawler that finds the
 * preview indexes a second copy of the site.
 */
export const SITE_URL = 'https://fonnus.ai'

export const SITE_NAME = 'Fonnus'

/** The claim after the name in the browser tab, and the first line of llms.txt. */
export const SITE_TAGLINE = 'Lễ tân AI trả lời bằng tiếng Việt'

export const SITE_DESCRIPTION =
  'Fonnus nghe máy cho phòng khám 24/7, báo giá rõ ràng, đặt lịch hẹn và chuyển cho người thật khi cần thiết.'

export interface SitePage {
  path: string
  /** The page's name where it is listed: the browser tab, llms.txt. */
  label: string
  description: string
}

/**
 * The pages a crawler is sent to: public, indexable, and built. `/dang-ky`
 * joins when it stops being a placeholder; the two legal pages join when their
 * text is published and their `noindex` is removed (PLAN.md §Backlog).
 * `/dang-nhap` is a door, reached from the header; a search result for it
 * sells nothing.
 */
export const SITE_PAGES = {
  home: { path: '/', label: 'Trang chủ', description: SITE_DESCRIPTION },
  hotline: {
    path: '/cham-diem-hotline',
    label: 'Chấm điểm hotline miễn phí',
    description:
      'Phòng khám nào cũng bỏ lỡ nhiều cuộc gọi hơn mình nghĩ. Để Fonnus gọi thử hotline từng cơ sở của bạn 5–7 lần, như một bệnh nhân thật, rồi nhận báo cáo chấm điểm miễn phí qua email.',
  },
} satisfies Record<string, SitePage>

export const SITEMAP_PATHS: readonly string[] = Object.values(SITE_PAGES).map((page) => page.path)
