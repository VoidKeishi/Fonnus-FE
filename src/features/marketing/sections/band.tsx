import { Pattern } from '@/design-system'
import { SECTION_INNER } from './section-chrome'

/*
 * The reference caps the pattern at 22% and never lets it run under the copy
 * at that strength. A mask thins it towards the text column instead of cutting
 * it off at a line. A mask reads only alpha, so the alias is there to carry no
 * hex, as the hero's does.
 */
const BAND_MASK =
  'linear-gradient(90deg, color-mix(in srgb, var(--text-heading) 22%, transparent) 0%, color-mix(in srgb, var(--text-heading) 45%, transparent) 40%, var(--text-heading) 72%)'

/**
 * The divider band — "Dải phân cách" in the visual language: the rings pattern
 * at ×3 on blush, with one line of copy in the left column. It is the only
 * pattern ground on the landing page, and it sits between what Fonnus does and
 * what it costs. No id and no link: it is not a place to go.
 */
export function Band() {
  return (
    <section
      aria-label="Fonnus"
      className="relative isolate overflow-clip bg-surface-warm px-[clamp(20px,5vw,64px)] py-[clamp(44px,7vh,76px)] text-text-heading"
    >
      <Pattern name="band" style={{ zIndex: -1, maskImage: BAND_MASK, WebkitMaskImage: BAND_MASK }} />
      <div className={SECTION_INNER}>
        <div
          data-reveal="0"
          className="mb-4 text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-accent uppercase"
        >
          Fonnus cho phòng khám
        </div>
        <h2
          data-reveal="1"
          className="m-0 max-w-[22ch] font-display text-[length:clamp(28px,3.6vw,44px)] leading-[1.2] font-semibold tracking-display text-pretty text-text-heading"
        >
          Phòng khám vẫn chạy, ngay cả khi bạn không ngồi đó.
        </h2>
      </div>
    </section>
  )
}
