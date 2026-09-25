/*
 * The Fonnus shapes — "Hình khối" — for the landing page and the app. Same grid
 * as the icons, blown up eight times (200 × 200), same two elements: the rising
 * arc and the ink dot.
 *
 * Ink is `currentColor`; the accent is `--icon-accent`, so a shape on a night
 * surface goes cream + night terracotta without being told.
 *
 * The prototype draws six. Only the two a screen here uses are drawn; the rest
 * (`handoff`, `relieved-owner`, `clear-price`, `appointment-grid`) arrive with
 * their first consumer. `docs/visual-language.md` § Shapes says what each means.
 */

export type ShapeName = 'always-on' | 'rising-arcs'

export interface ShapeProps {
  name: ShapeName
  size?: number
  className?: string
}

const ACCENT = 'var(--icon-accent, var(--text-eyebrow))'

export function Shape({ name, size = 180, className = '' }: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      className={`block flex-none ${className}`}
    >
      {name === 'always-on' ? (
        /* Nghe máy 24/7 — a closed ring: no part of the day is left empty. The
           accent arc covers the hours no one is on duty. */
        <>
          <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="3" />
          <path d="M28 100A72 72 0 0 1 100 28" stroke={ACCENT} strokeWidth="11" strokeLinecap="round" />
          <path
            d="M100 22v10M178 100h-10M100 178v-10M22 100h10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="16" fill="currentColor" />
        </>
      ) : (
        /* Cuộc gọi được trả lời — three arcs rising from one point: the rising
           arc of the motion system. Heroes and opening sections. */
        <>
          <path d="M18 152H182" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
          <path d="M16 152A84 84 0 0 1 184 152" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M38 152A62 62 0 0 1 162 152" stroke={ACCENT} strokeWidth="11" strokeLinecap="round" />
          <path d="M60 152A40 40 0 0 1 140 152" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="152" r="10" fill="currentColor" />
        </>
      )}
    </svg>
  )
}
