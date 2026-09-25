'use client'

import { useId, useState } from 'react'
import { Icon } from '@/design-system'
import type { FaqItem } from '@/data/content'

/**
 * The questions, one answer open at a time; the first is open on load and
 * clicking the open one closes it.
 *
 * Every answer stays mounted and eases from a `0fr` row to `1fr`, which gives
 * a real height transition without measuring the text. A closed answer is
 * `inert`: out of sight, and out of the tab order and the accessibility tree
 * with it, so a screen reader reads only what a sighted reader can see.
 */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const baseId = useId()

  return (
    <div data-reveal="2" className="flex flex-col gap-3">
      {items.map((item, i) => {
        const open = openIndex === i
        const panelId = `${baseId}-panel-${String(i)}`
        return (
          <div key={item.q} className="rounded-lg bg-surface-card px-6 py-1">
            <button
              type="button"
              onClick={() => {
                setOpenIndex(open ? null : i)
              }}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent px-0 py-5 text-left font-display text-body-lg leading-[1.4] font-semibold text-text-heading"
            >
              <span>{item.q}</span>
              {/* The plus turns into the close cross by rotating: one glyph, two states. */}
              <span
                aria-hidden="true"
                className={`inline-flex flex-none text-text-eyebrow transition-transform duration-(--duration-base) ease-out motion-reduce:transition-none ${open ? 'rotate-45' : ''}`}
              >
                <Icon name="plus" size={18} />
              </span>
            </button>
            <div
              id={panelId}
              inert={!open}
              className={[
                'grid',
                '[transition:grid-template-rows_var(--duration-slow)_var(--ease-arc),opacity_var(--duration-slow)_var(--ease-arc)]',
                'motion-reduce:transition-none',
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              ].join(' ')}
            >
              <div className="min-h-0 overflow-clip">
                <p className="m-0 mb-[22px] max-w-[64ch] text-body text-text-muted">{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
