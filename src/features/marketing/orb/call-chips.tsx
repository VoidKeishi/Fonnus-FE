import { useEffect, useRef, useState } from 'react'
import type { AnimationEvent, RefObject, TransitionEvent } from 'react'
import { CHIP_TREE } from '@/data/call-demo'
import type { SuggestionChip } from '@/data/call-demo'
import { chipsAfter } from './call-state'

/*
 * The suggestion chips above the typed line. A chip that reaches the session
 * fades its whole set out, and the set that follows from it (`chipsAfter`)
 * fades in, so the tap visibly went through. Mounted with the call's
 * controls, so every call starts on the first set with nothing sent.
 *
 * Under reduced motion the row has no transition and the sets swap at once.
 */

interface CallChipsProps {
  /** Sends a chip's question; false when no session took it. */
  ask: (text: string) => boolean
  /** Where focus goes when a tapped chip leaves no chip behind it. */
  fallbackFocus: RefObject<HTMLElement | null>
}

/**
 * `leaving` holds the set that follows, until the shown one has faded out.
 * `arriving` lasts while the new set fades in: a fade-out started then would
 * change nothing a transition sees, its `transitionend` would never come, and
 * the row would stay invisible. Taps wait for `idle` either way.
 */
type Phase = { name: 'idle' } | { name: 'leaving'; next: readonly SuggestionChip[] } | { name: 'arriving' }

export function CallChips({ ask, fallbackFocus }: CallChipsProps) {
  const [chips, setChips] = useState<readonly SuggestionChip[]>(CHIP_TREE)
  const [sent, setSent] = useState<ReadonlySet<string>>(() => new Set())
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  // Bumped by every swap. The row is keyed on it, so a new set starts scrolled
  // back to its first chip and runs its fade-in.
  const [round, setRound] = useState(0)
  const rowRef = useRef<HTMLDivElement>(null)
  /** Focus was in the old set as it went: it must land somewhere in the new one. */
  const refocus = useRef(false)

  const swap = (next: readonly SuggestionChip[], animated: boolean) => {
    // Read as the old set leaves, not at the tap: a visitor may have tabbed
    // away while it faded.
    refocus.current = rowRef.current?.contains(document.activeElement) ?? false
    setChips(next)
    setPhase(animated ? { name: 'arriving' } : { name: 'idle' })
    setRound((count) => count + 1)
  }

  const tap = (chip: SuggestionChip) => {
    if (phase.name !== 'idle' || !ask(chip.label)) return
    const nowSent = new Set(sent).add(chip.label)
    setSent(nowSent)
    const next = chipsAfter(chip, nowSent)
    const row = rowRef.current
    if (!row || Number.parseFloat(getComputedStyle(row).transitionDuration) === 0) {
      swap(next, false)
      return
    }
    setPhase({ name: 'leaving', next })
  }

  const onFadedOut = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || phase.name !== 'leaving') return
    swap(phase.next, true)
  }

  const onFadedIn = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setPhase({ name: 'idle' })
  }

  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    const target = rowRef.current?.querySelector('button') ?? fallbackFocus.current
    target?.focus({ preventScroll: true })
  }, [round, fallbackFocus])

  return (
    <div
      key={round}
      ref={rowRef}
      onTransitionEnd={onFadedOut}
      onAnimationEnd={onFadedIn}
      className={[
        'flex max-w-full flex-nowrap justify-start gap-2.5 overflow-x-auto p-1 whitespace-nowrap',
        'motion-safe:transition-opacity motion-safe:duration-[var(--duration-base)] motion-safe:ease-out',
        round > 0 ? 'motion-safe:animate-[fnFadeIn_var(--duration-slow)_var(--ease-arc)]' : '',
        phase.name === 'leaving' ? 'pointer-events-none opacity-0' : '',
      ].join(' ')}
    >
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => {
            tap(chip)
          }}
          className="flex-none cursor-pointer rounded-pill border-none bg-surface-card px-4 py-2.5 font-ui text-ui font-medium text-text-body shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors duration-[var(--duration-fast)] ease-out hover:bg-action-secondary-hover"
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
