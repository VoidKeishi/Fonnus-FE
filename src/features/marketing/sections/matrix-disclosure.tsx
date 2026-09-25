'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/design-system'

/**
 * The toggle that opens the full comparison, and the region it opens. Holds
 * only open/closed: the table itself is server-rendered and arrives as
 * `children`.
 *
 * The region stays mounted and eases from a `0fr` row to `1fr` rather than
 * appearing in one frame. While closed it is `inert`, so the table is neither
 * in the tab order nor in the accessibility tree — it is only out of sight.
 * The single `minmax(0, 1fr)` column is what keeps the 720px table from
 * widening the page on a phone: it scrolls inside its own scroller instead.
 */
export function MatrixDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        className="inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 font-ui text-body-sm leading-[normal] font-medium text-text-accent"
      >
        <span>{open ? 'Thu gọn bảng so sánh đầy đủ' : 'Xem bảng so sánh đầy đủ'}</span>
        <span
          aria-hidden="true"
          className={`inline-flex transition-transform duration-[var(--duration-base)] ease-out ${open ? 'rotate-180' : ''}`}
        >
          <Icon name="chevron-down" size={16} />
        </span>
      </button>

      <div
        inert={!open}
        className={[
          'grid grid-cols-[minmax(0,1fr)]',
          '[transition:grid-template-rows_var(--duration-slow)_var(--ease-out),opacity_var(--duration-base)_var(--ease-out)]',
          'motion-reduce:transition-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        ].join(' ')}
      >
        <div className="min-h-0 overflow-clip">{children}</div>
      </div>
    </>
  )
}
