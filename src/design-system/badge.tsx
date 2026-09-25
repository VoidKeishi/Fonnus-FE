import type { ReactNode } from 'react'

/*
 * The tones something on screen already wears; the prototype's success,
 * warning, error, info and lemongrass arrive with their first consumer. Each
 * ground is its ink at low strength, mixed from the alias rather than written
 * as a colour.
 */
type BadgeTone = 'neutral' | 'terracotta'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[color-mix(in_srgb,var(--text-heading)_6%,transparent)] text-text-muted',
  terracotta: 'bg-[color-mix(in_srgb,var(--text-eyebrow)_12%,transparent)] text-text-accent',
}

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
}

/** A short status pill: an outcome, a state. Holds no state, so it renders on the server. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-ui text-ui leading-[1.4] font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
