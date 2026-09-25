import type { ReactNode } from 'react'
import { Icon } from '@/design-system'

interface CapabilityRowProps {
  eyebrow: string
  title: string
  body: string
  points: string[]
  /** Mirror the row so consecutive capabilities alternate sides. */
  reversed?: boolean
  /** The first row's body runs a little wider (44ch against 42ch). */
  wideBody?: boolean
  visual: ReactNode
}

/**
 * One capability: copy on one side, its visual on the other. A server
 * component; the visual may hold a client player.
 *
 * Alternating rows flip with `direction: rtl` rather than `order`, so that when
 * the columns wrap to one the copy still lands above its visual. The columns
 * align to the top: the call players grow as a call rolls, and centring would
 * make the copy drift up and down beside them. Under 900px it is one column so
 * the player gets the full measure.
 */
export function CapabilityRow({
  eyebrow,
  title,
  body,
  points,
  reversed = false,
  wideBody = false,
  visual,
}: CapabilityRowProps) {
  return (
    <div
      className={[
        'grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-[clamp(28px,5vw,64px)]',
        'max-[901px]:grid-cols-[minmax(0,1fr)]',
        reversed ? '[direction:rtl] *:[direction:ltr]' : '',
      ].join(' ')}
    >
      <div data-reveal="0" data-reveal-from={reversed ? 'right' : 'left'}>
        <div className="mb-4 text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-eyebrow uppercase">
          {eyebrow}
        </div>
        <h3 className="m-0 mb-3.5 font-display text-heading leading-[1.3] font-semibold tracking-display text-text-heading">
          {title}
        </h3>
        <p
          className={`m-0 mb-5 text-body leading-[1.65] text-text-muted ${wideBody ? 'max-w-[44ch]' : 'max-w-[42ch]'}`}
        >
          {body}
        </p>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-body-sm leading-(--leading-body)">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5">
              <span className="inline-flex h-[1.6em] flex-none items-center font-semibold text-text-accent">
                <Icon name="check" size={16} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div data-reveal="1" data-reveal-from={reversed ? 'left' : 'right'}>
        {visual}
      </div>
    </div>
  )
}
