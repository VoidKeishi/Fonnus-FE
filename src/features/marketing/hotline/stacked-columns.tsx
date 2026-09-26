'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from 'react'
import { bracketSpan, placeTip, slotAt } from './chart-geometry'
import type { TipPlacement } from './chart-geometry'

/*
 * The prototype's `StackedColumns` from its app chart kit, ported for this one
 * page (marketing never imports `src/ui/`). Only what this chart uses came
 * across: the columns, the scrub and the tip.
 *
 * Columns that are each one whole split in two — the share that matters solid
 * from the baseline, the rest a pale step of the same hue above it, 2px of card
 * between them. Every column is 100%, so what is compared is where the solid
 * part stops. The solid part is the primary button's ground rather than the
 * ramp's top step, because it carries cream figures at 12.5px and plain
 * terracotta is 4.0:1.
 *
 * The solid parts grow from the baseline on first paint (`@starting-style`),
 * and inside a block that lifts in on scroll they wait at zero until the block
 * arrives. Charts carry no Vietnamese of their own: every label, tick and tip
 * is written by the page.
 */

/** What a mark says when it is pointed at: where, how many, and one line of why it matters. */
export interface ChartTip {
  head: string
  value: string
  meta?: string
}

export interface StackedColumn {
  key: string
  tick: string
  /** The share drawn solid from the baseline, 0–100. The rest of the column is its complement. */
  share: number
  /** Printed inside the solid part. */
  shareLabel: string
  /** Printed inside the pale rest. */
  restLabel: string
  tip: ChartTip
}

interface StackedColumnsProps {
  columns: readonly StackedColumn[]
  /** What the chart is, for a screen reader: the card's title. */
  label: string
  height?: number
  /** A run of columns named under the axis — the working day. */
  bracket?: { from: number; to: number; label: string }
}

/* While one column is pointed at, the others step back to half strength. */
const DIMMED_WHILE_SCRUBBING = '[[data-scrub]_[role=listitem]:not([data-on])_&]:opacity-50'
/* Inside a block still waiting to lift in, the solid part waits at zero. */
const HELD_UNTIL_REVEALED = '[[data-reveal-armed]_[data-reveal]:not([data-revealed])_&]:h-0'

const STACK_LABEL =
  'absolute inset-x-0 top-[7px] text-center font-num text-[12.5px] leading-[1.3] tabular-nums whitespace-nowrap max-[480px]:top-[5px] max-[480px]:text-[11px]'

export function StackedColumns({ columns, label, height = 240, bracket }: StackedColumnsProps) {
  const count = columns.length
  const { hostRef, active, source, handlers } = useScrub(count)
  const span = bracket ? bracketSpan(bracket.from, bracket.to, count) : null

  return (
    <div
      ref={hostRef}
      {...handlers}
      tabIndex={0}
      role="group"
      aria-label={label}
      data-scrub={active === null ? undefined : ''}
      className="relative min-w-0 touch-pan-y rounded-sm outline-none [-webkit-tap-highlight-color:transparent] focus-visible:shadow-[var(--ring-focus)]"
    >
      <div data-track role="list" style={{ height }} className="relative flex items-stretch border-b border-border-hairline">
        {columns.map((column, i) => (
          <div
            key={column.key}
            role="listitem"
            aria-label={`${column.tip.head}: ${column.tip.value}`}
            data-on={active === i ? '' : undefined}
            className="relative flex h-full min-w-0 flex-1 basis-0 justify-center before:absolute before:inset-x-0.5 before:-top-1.5 before:bottom-0 before:rounded-t-md before:bg-action-ghost-hover before:opacity-0 before:transition-opacity before:duration-(--duration-fast) before:ease-out before:content-[''] data-[on]:before:opacity-100 motion-reduce:before:transition-none"
          >
            <span
              data-anchor={i}
              style={{ '--to': `${String(column.share)}%`, '--at': `${String(i * 60)}ms` } as CSSProperties}
              className={`relative flex h-full w-[64%] max-w-16 min-w-[26px] flex-col gap-0.5 transition-opacity duration-(--duration-fast) ease-out motion-reduce:transition-none ${DIMMED_WHILE_SCRUBBING}`}
            >
              <span className="relative min-h-0 flex-auto overflow-hidden rounded-t-[8px] rounded-b-[3px] bg-chart-step-2 text-text-muted">
                <span className={`${STACK_LABEL} font-medium`}>{column.restLabel}</span>
              </span>
              <span
                className={`relative h-(--to) min-h-0 flex-none overflow-hidden rounded-t-[3px] bg-action-primary text-text-on-accent transition-[height] delay-(--at) duration-(--duration-arc) ease-arc starting:h-0 motion-reduce:transition-none ${HELD_UNTIL_REVEALED}`}
              >
                <span className={`${STACK_LABEL} font-semibold`}>{column.shareLabel}</span>
              </span>
            </span>
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="mt-[7px] flex h-[18px]">
        {columns.map((column, i) => (
          <span key={column.key} data-on={active === i ? '' : undefined} className="relative min-w-0 flex-1 basis-0">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[11.5px] leading-[1.4] whitespace-nowrap text-text-muted transition-colors duration-(--duration-fast) ease-out [[data-on]>&]:font-semibold [[data-on]>&]:text-text-heading">
              {column.tick}
            </span>
          </span>
        ))}
      </div>

      {bracket && span ? (
        <div aria-hidden="true" className="relative mt-0.5 h-8">
          {/* Open at the top, towards the columns it names. */}
          <span
            style={{ left: span.left, width: span.width }}
            className="absolute top-0.5 h-1.5 border border-t-0 border-border-strong opacity-65"
          />
          <span
            style={{ left: span.labelLeft }}
            className="absolute top-3 -translate-x-1/2 text-[11.5px] leading-[1.4] whitespace-nowrap text-text-muted"
          >
            {bracket.label}
          </span>
        </div>
      ) : null}

      <TipBox hostRef={hostRef} active={active} columns={columns} announce={source === 'key'} />
    </div>
  )
}

type Source = 'mouse' | 'touch' | 'key'

const KEY_MOVES: Partial<Record<string, (at: number, last: number) => number>> = {
  ArrowRight: (at) => at + 1,
  ArrowDown: (at) => at + 1,
  ArrowLeft: (at) => at - 1,
  ArrowUp: (at) => at - 1,
  Home: () => 0,
  End: (_at, last) => last,
}

/**
 * One hover model: the tip is there the moment the pointer is, the target is
 * the whole slot rather than the ink, a tap keeps its tip until the next tap
 * elsewhere (a finger lifts, a cursor does not), a sideways drag scrubs while
 * an up-and-down one still scrolls the page, and arrow keys walk the columns
 * once the chart has focus.
 */
function useScrub(count: number) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const [source, setSource] = useState<Source>('mouse')

  // A tapped tip stays until a tap lands outside the chart.
  useEffect(() => {
    if (active === null || source !== 'touch') return
    const onDown = (e: globalThis.PointerEvent) => {
      if (hostRef.current && e.target instanceof Node && !hostRef.current.contains(e.target)) setActive(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('pointerdown', onDown)
    }
  }, [active, source])

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const track = e.currentTarget.querySelector('[data-track]') ?? e.currentTarget
    const box = track.getBoundingClientRect()
    setSource(e.pointerType === 'mouse' ? 'mouse' : 'touch')
    setActive(slotAt(e.clientX, box.left, box.width, count))
  }

  const handlers = {
    onPointerDown: pick,
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      // A finger that is not down is not pointing at anything.
      if (e.pointerType !== 'mouse' && e.buttons === 0) return
      pick(e)
    },
    onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') setActive(null)
    },
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        setActive(null)
        return
      }
      const move = KEY_MOVES[e.key]
      if (!move) return
      e.preventDefault()
      setSource('key')
      setActive((at) => Math.max(0, Math.min(count - 1, at === null ? count - 1 : move(at, count - 1))))
    },
    onBlur: () => {
      setActive(null)
    },
  }

  return { hostRef, active, source, handlers }
}

interface TipBoxProps {
  hostRef: RefObject<HTMLDivElement | null>
  active: number | null
  columns: readonly StackedColumn[]
  announce: boolean
}

/**
 * The one tip: night paper and cream type. Centred over the column, clamped to
 * the chart so it never leaves the card on a phone, flipped below when the
 * viewport's top edge is too close; from one column to the next it glides, and
 * arriving from hidden it snaps. Announced only when walked by keyboard.
 */
function TipBox({ hostRef, active, columns, announce }: TipBoxProps) {
  const tipRef = useRef<HTMLDivElement>(null)
  const wasShown = useRef(false)
  const [placement, setPlacement] = useState<(TipPlacement & { glide: boolean }) | null>(null)
  // Fading out keeps the last words on it, rather than shrinking to an empty box.
  const [lastActive, setLastActive] = useState<number | null>(active)
  if (active !== null && active !== lastActive) setLastActive(active)

  // Placed after layout, from the column's and the tip's own boxes: the tip's width depends on its words.
  useLayoutEffect(() => {
    const glide = wasShown.current
    wasShown.current = active !== null
    const host = hostRef.current
    const tip = tipRef.current
    const mark = active === null ? null : host?.querySelector<HTMLElement>(`[data-anchor="${String(active)}"]`)
    if (!host || !tip || !mark) return
    const placed = placeTip(host.getBoundingClientRect(), mark.getBoundingClientRect(), {
      width: tip.offsetWidth,
      height: tip.offsetHeight,
    })
    setPlacement({ ...placed, glide })
  }, [active, hostRef])

  const shown = active !== null && placement !== null
  const content = lastActive === null ? undefined : columns[lastActive]?.tip
  const style = placement
    ? ({ transform: `translate(${String(placement.x)}px, ${String(placement.y)}px)`, '--caret': `${String(placement.caret)}px` } as CSSProperties)
    : undefined

  return (
    <div
      ref={tipRef}
      role={announce ? 'status' : undefined}
      aria-hidden={announce ? undefined : true}
      style={style}
      className={[
        'pointer-events-none absolute top-0 left-0 z-30 flex w-max max-w-[220px] flex-col gap-px rounded-md bg-surface-inverse px-3 pt-2 pb-[9px] font-ui text-text-on-inverse shadow-overlay',
        "after:absolute after:left-[var(--caret,50%)] after:-ml-[4.5px] after:size-[9px] after:rotate-45 after:rounded-[2px] after:bg-surface-inverse after:content-['']",
        placement?.below ? 'after:-top-1' : 'after:-bottom-1',
        shown ? 'opacity-100' : 'opacity-0',
        placement?.glide && shown
          ? 'transition-[opacity,transform] [transition-duration:var(--duration-fast),160ms] ease-out'
          : 'transition-opacity duration-(--duration-fast) ease-out',
        'motion-reduce:transition-none',
      ].join(' ')}
    >
      {content ? (
        <>
          <span className="text-[11.5px] leading-[1.4] whitespace-nowrap opacity-72">{content.head}</span>
          <span className="font-num text-[15px] leading-[1.35] font-semibold tabular-nums whitespace-nowrap">
            {content.value}
          </span>
          {content.meta ? <span className="text-[12px] leading-[1.4] opacity-86">{content.meta}</span> : null}
        </>
      ) : null}
    </div>
  )
}
