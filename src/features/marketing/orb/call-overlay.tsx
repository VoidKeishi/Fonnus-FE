import { useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Icon, Pattern } from '@/design-system'
import { CHIPS, VOICES } from '@/data/call-demo'
import { useCallDemo } from './call-demo-provider'
import { stateLabel } from './call-state'
import type { CallDemo } from './use-call-demo'

/*
 * The call screen. Three things and nothing else: the orb, a way to type, and a
 * way out. The orb itself is not rendered here — it flies in from the page and
 * lands on the slot (`spotRef`).
 *
 * The controls sit above the screen in their own layer so the voice menu can
 * never be painted under the orb (screen 60, orb 70, controls 80). They fade
 * in — no slide, which read as "frozen mid-air" during the orb's flight.
 *
 * Modal by `inert`, not by `<dialog>.showModal()`: the top layer would paint
 * the panel over the orb, which has to sit between the screen and the controls.
 */

/* Same treatment as the hero: Chấm nhịp behind the orb only, centred on its slot. */
const DOTS_MASK =
  'radial-gradient(circle at 50% 46%, var(--text-heading) 0%, color-mix(in srgb, var(--text-heading) 55%, transparent) 16%, transparent 38%)'
const FAST = 'transition-colors duration-[var(--duration-fast)] ease-out'
const ROUND = `grid size-10 flex-none cursor-pointer place-items-center rounded-[50%] border-none ${FAST}`
const IDLE = 'bg-surface-card text-text-body'
const ACTIVE = 'bg-text-heading text-text-on-accent'

interface CallOverlayProps {
  spotRef: RefObject<HTMLDivElement | null>
  /**
   * The orb: a sibling of the dialog left out of the inert page, since it is
   * the call's picture, and where focus goes back to when the call was not
   * opened from anywhere else.
   */
  orbRef: RefObject<HTMLElement | null>
}

export function CallOverlay({ spotRef, orbRef }: CallOverlayProps) {
  const demo = useCallDemo()
  const { returnFocusTo } = demo
  const [typed, setTyped] = useState('')
  const [voiceOpen, setVoiceOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const orb = orbRef.current
    const opener = returnFocusTo()
    const release = inertOutside(dialog, orb)
    dialog.focus({ preventScroll: true })
    return () => {
      // Released first: an inert element cannot take focus.
      release()
      // The page is still locked and the orb may be mid-flight back to the
      // hero; focusing must not scroll either.
      // The drawer's menu button stays in the page but is display:none once the
      // window widens past the nav breakpoint; focus() on it would fail silently.
      const target = opener && opener.getClientRects().length > 0 ? opener : orb
      target?.focus({ preventScroll: true })
    }
  }, [orbRef, returnFocusTo])

  const send = () => {
    if (!typed.trim()) return
    demo.ask(typed)
    setTyped('')
  }

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="outline-none">
      <div className="fixed inset-0 isolate z-60 grid grid-rows-[auto_1fr_auto] bg-surface-page px-[clamp(16px,4vw,40px)] pt-5 pb-[clamp(20px,4vh,40px)] motion-safe:animate-[fnFadeIn_320ms_var(--ease-arc)]">
        <Pattern
          name="dots"
          className="text-text-heading [@media(max-width:900px)]:hidden!"
          style={{ zIndex: -1, maskImage: DOTS_MASK, WebkitMaskImage: DOTS_MASK }}
        />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-ui leading-(--leading-body) text-text-muted">
            <span className="size-2 rounded-[50%] bg-text-eyebrow" />
            <span id={titleId}>Nha khoa Minh Anh · bản mô phỏng</span>
          </div>
          <button
            type="button"
            onClick={demo.closeCall}
            aria-label="Thoát cuộc gọi thử"
            className={`grid size-11 cursor-pointer place-items-center rounded-[50%] border-none bg-text-heading text-text-on-accent hover:bg-text-accent ${FAST}`}
          >
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="grid place-items-center content-center gap-[60px]">
          {/* Wide gap: the waves finish fading before they reach the label. */}
          <div ref={spotRef} aria-hidden="true" className="size-[clamp(200px,32vh,320px)]" />
          <div role="status" className="min-h-[22px] font-ui text-body-sm leading-(--leading-body) font-medium text-text-muted">
            {stateLabel(demo.agent, demo.mic)}
          </div>
        </div>

        {/* Reserves room under the orb for the controls, which are fixed. */}
        <div className="h-[170px]" />
      </div>

      <div className="fixed bottom-[clamp(20px,4vh,40px)] left-1/2 z-80 flex w-[min(760px,calc(100vw-32px))] -translate-x-1/2 flex-col items-center gap-4 motion-safe:animate-[fnFadeIn_420ms_var(--ease-arc)_120ms_both]">
        <div className="flex max-w-full flex-nowrap justify-start gap-2.5 overflow-x-auto p-1 whitespace-nowrap">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                demo.ask(chip.label)
              }}
              className={`flex-none cursor-pointer rounded-pill border-none bg-surface-card px-4 py-2.5 font-ui text-ui font-medium text-text-body shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-action-secondary-hover ${FAST}`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center gap-2.5 rounded-pill bg-surface-card py-2.5 pr-3 pl-[22px] shadow-[inset_0_0_0_1px_var(--border-hairline),var(--shadow-overlay)]">
          {/* The pill carries the hairline and the shadow; the global
              :focus-visible ring would draw a square inside it. */}
          <input
            placeholder="Gõ câu hỏi nếu bạn không muốn nói…"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value)
            }}
            onKeyDown={(e) => {
              // Enter that confirms a Vietnamese IME composition is not a send.
              if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
              e.preventDefault()
              send()
            }}
            className="min-w-0 flex-1 border-none bg-transparent font-ui text-body-sm text-text-body outline-none placeholder:text-text-muted focus-visible:outline-none"
          />

          <button
            type="button"
            onClick={demo.toggleMic}
            aria-label="Bật tắt micro"
            aria-pressed={!demo.mic}
            className={`${ROUND} ${demo.mic ? IDLE : ACTIVE}`}
          >
            <Icon name={demo.mic ? 'voice' : 'voice-off'} size={18} />
          </button>

          <span className="relative inline-flex flex-none">
            <button
              type="button"
              onClick={() => {
                setVoiceOpen((v) => !v)
              }}
              aria-label="Chọn giọng nói của trợ lý"
              aria-expanded={voiceOpen}
              className={`${ROUND} ${voiceOpen ? ACTIVE : IDLE}`}
            >
              <Icon name="caller" size={18} />
            </button>
            {voiceOpen ? <VoiceMenu demo={demo} /> : null}
          </span>

          <button
            type="button"
            onClick={send}
            aria-label="Gửi"
            className={`${ROUND} bg-action-primary text-text-on-accent [--icon-accent:currentColor] hover:bg-action-primary-hover`}
          >
            <Icon name="arrow-up" size={18} />
          </button>
        </div>

        <p className="m-0 text-center text-ui leading-(--leading-body) text-text-muted">
          Fonnus luôn trả lời bằng giọng nói. Bấm ✕ để thoát.
        </p>
      </div>
    </div>
  )
}

function VoiceMenu({ demo }: { demo: CallDemo }) {
  return (
    <div
      role="group"
      aria-label="Giọng của trợ lý"
      className="absolute right-0 bottom-[52px] w-[296px] rounded-lg bg-surface-card p-2 shadow-[var(--shadow-overlay),inset_0_0_0_1px_var(--border-hairline)] motion-safe:animate-[fnRise_200ms_var(--ease-arc)]"
    >
      <div className="px-3 pt-2.5 pb-2 text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-muted uppercase">
        Giọng của trợ lý
      </div>
      {VOICES.map((v, i) => {
        const selected = demo.voice === i
        return (
          // Two sibling buttons, never one inside the other. The row keeps the
          // fill; the choosing button carries its left and vertical padding so
          // the whole row up to the preview stays one target.
          <div
            key={v.name}
            className={[
              'flex w-full items-center gap-3 rounded-[10px] pr-3 transition-colors duration-[120ms] ease-[ease-out]',
              selected
                ? 'bg-action-primary text-text-on-accent [--icon-accent:currentColor]'
                : 'bg-transparent text-text-body hover:bg-action-ghost-hover',
            ].join(' ')}
          >
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => {
                demo.setVoice(i)
              }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[10px] border-none bg-transparent py-2.5 pl-3 text-left text-inherit"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm leading-[1.4] font-semibold">{v.name}</span>
                <span className="block text-ui leading-[1.4] opacity-72">{v.desc}</span>
              </span>
              {selected ? <Icon name="check" size={14} /> : null}
            </button>
            {/* Auditions the voice without selecting it. */}
            <button
              type="button"
              aria-label={`Nghe thử giọng ${v.name}`}
              onClick={demo.previewVoice}
              className={[
                'grid size-[34px] flex-none cursor-pointer place-items-center rounded-[50%] border-none',
                selected
                  ? 'bg-[color-mix(in_srgb,var(--text-on-accent)_20%,transparent)] text-text-on-accent'
                  : 'bg-surface-warm text-text-accent',
              ].join(' ')}
            >
              <Icon name="play" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Makes the page outside the dialog inert: at every level from the dialog up
 * to <body>, each sibling of the path. Only what was not inert already is
 * touched, and the returned undo releases exactly that. `keep` stays live.
 */
function inertOutside(dialog: HTMLElement, keep: Element | null): () => void {
  const made: HTMLElement[] = []
  for (let node = dialog; node !== document.body; ) {
    const parent = node.parentElement
    if (!parent) break
    for (const sibling of parent.children) {
      if (sibling === node || sibling === keep || !(sibling instanceof HTMLElement) || sibling.inert) continue
      sibling.inert = true
      made.push(sibling)
    }
    node = parent
  }
  return () => {
    for (const element of made) element.inert = false
  }
}
