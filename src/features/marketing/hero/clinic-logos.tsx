import type { ReactNode } from 'react'

/*
 * PLACEHOLDER customer marks for the hero's proof row.
 *
 * These are invented clinics, drawn here so the row can be judged as a design —
 * two of the names ("Nha khoa Minh Anh", "Việt Smile") are the same fictional
 * clinics the call demo and the Google account chooser already use. Swap them
 * for real customer logos before this page goes live, and only with each
 * clinic's permission: a real logo here reads as an endorsement.
 */
export interface ClinicLogo {
  name: string
  /** Circle fill, all from the clay family so the row adds no new hue. */
  bg: string
  glyph: ReactNode
}

/* The glyph is drawn in the cream that sits on terracotta. */
const GLYPH = 'var(--text-on-accent)'

export const CLINIC_LOGOS: ClinicLogo[] = [
  {
    name: 'Nha khoa Minh Anh',
    bg: 'var(--text-accent)',
    // A molar, reduced to two crowns and a root.
    glyph: (
      <path
        d="M7 8.2c0-1.7 1.3-2.9 2.9-2.9.9 0 1.5.3 2.1.3s1.2-.3 2.1-.3c1.6 0 2.9 1.2 2.9 2.9 0 2-.8 2.9-1.2 5-.3 1.5-.4 3.3-1.3 3.3-.8 0-.8-1.6-1.1-3-.2-.9-.4-1.6-1.4-1.6s-1.2.7-1.4 1.6c-.3 1.4-.3 3-1.1 3-.9 0-1-1.8-1.3-3.3C7.8 11.1 7 10.2 7 8.2Z"
        fill={GLYPH}
      />
    ),
  },
  {
    name: 'Việt Smile Clinic',
    bg: 'var(--text-eyebrow)',
    // A smile: the arc from the Fonnus mark, turned the other way up.
    glyph: (
      <>
        <path d="M7.5 12.8a4.5 4.5 0 0 0 9 0" stroke={GLYPH} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <circle cx="9.2" cy="8.8" r="1.25" fill={GLYPH} />
        <circle cx="14.8" cy="8.8" r="1.25" fill={GLYPH} />
      </>
    ),
  },
  {
    name: 'Phòng khám An Bình',
    // The prototype's light clay has no alias; terracotta softened by a quarter
    // of cream lands within a few units of it on every channel.
    bg: 'color-mix(in srgb, var(--text-eyebrow) 75%, var(--text-on-accent))',
    // A clinic cross with a pulse notch through it.
    glyph: <path d="M12 6.2v11.6M6.2 12h11.6" stroke={GLYPH} strokeWidth="2.4" strokeLinecap="round" />,
  },
]

/** 24px mark on a filled circle — sized by the caller. */
export function ClinicMark({ logo, size = 32 }: { logo: ClinicLogo; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={logo.name}
      style={{ display: 'block', borderRadius: '50%', background: logo.bg }}
    >
      <title>{logo.name}</title>
      {logo.glyph}
    </svg>
  )
}
