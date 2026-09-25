'use client'

import { useReveal } from './use-reveal'

/**
 * Arms the scroll reveal for the page it is mounted on. Renders nothing; it is
 * a leaf only so the page around it can stay a server component. Mount it once
 * per page, after the sections, so every `data-reveal` block is in the DOM when
 * it runs.
 */
export function ScrollReveal() {
  useReveal()
  return null
}
