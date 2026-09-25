/*
 * The rhythm every landing section below the hero sits on: a clamped vertical
 * band, the 1280px inner column, an eyebrow, a display heading. Class strings
 * rather than a component, so a section keeps its own element, its `id`, its
 * ground and its `data-reveal` orders. The ground (`bg-surface-card`,
 * `bg-surface-page`) is the section's own choice and is added beside the band.
 *
 * The side inset matches the hero and the header's rail, so every section's
 * edge lines up with the pill above it.
 */

/**
 * `scroll-margin-top` clears the floating header, so a heading reached through
 * `/#<id>` lands below the pill instead of under it.
 */
export const SECTION_BAND = 'px-[clamp(20px,5vw,64px)] py-[clamp(64px,11vh,128px)] scroll-mt-[110px]'

export const SECTION_INNER = 'mx-auto max-w-[1280px]'

/* No line height of its own in the prototype: it inherits the body's. */
export const SECTION_EYEBROW =
  'mb-5 text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-eyebrow uppercase'

export const SECTION_HEADING =
  'm-0 font-display text-[length:clamp(30px,3.8vw,44px)] leading-[1.2] font-semibold tracking-display text-pretty text-text-heading'
