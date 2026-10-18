import { useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import Link from 'next/link'
import { Button, buttonClassName, Icon } from '@/design-system'
import {
  CALL_AGAIN_LABEL,
  CONNECT_FAILED_LINE,
  CONSENT_LINE,
  SPEAKER_LABELS,
  START_LABEL,
  TEXT_FOOTNOTE,
  TEXT_MODE_LINE,
  TEXT_PLACEHOLDER,
  WAITLIST_LABEL,
} from '@/data/call-demo'
import { CallChips } from './call-chips'
import { CallCountdown } from './call-countdown'
import { useCallDemo } from './call-demo-provider'
import { createDotField } from './dot-field'
import type { DotField } from './dot-field'
import { budgetLine, endingLine, spentLine, stateLabel } from './call-state'
import type { ThreadLine } from './use-call-demo'
import { useTurnstile } from './use-turnstile'

/*
 * The call screen. Three things and nothing else: the orb, a way to type, and a
 * way out. The orb itself is not rendered here — it flies in from the page and
 * lands on the slot (`spotRef`).
 *
 * The controls sit above the screen in their own layer so nothing in them can
 * be painted under the orb (screen 60, orb 70, controls 80). They fade in — no
 * slide, which read as "frozen mid-air" during the orb's flight.
 *
 * Modal by `inert`, not by `<dialog>.showModal()`: the top layer would paint
 * the panel over the orb, which has to sit between the screen and the controls.
 *
 * The slot under the orb has four shapes: the state line while a session
 * runs, the consent line before the call connects, the ending of a call that
 * ended on its own, and a call that could not connect. The last three hide the
 * controls, which have nothing to talk to, but keep the room reserved for them
 * so the orb does not move.
 *
 * The hour's budget (ADR 0008) shows in words in two of them. While a session
 * runs it is the countdown under the title instead (ADR 0010), which every
 * other shape leaves empty. Consent says what is left when part of the hour is spent, and with
 * nothing left it says when the next call can start and offers only the
 * waitlist. An ending that spent the rest of the hour says the same and drops
 * "Gọi lại" until the hour turns: a button that opens a call that cannot
 * connect is a promise the screen cannot keep. The number is the server's
 * (ADR 0009) and may arrive after the slot does; until it has, the slot keeps
 * its ordinary shape.
 *
 * A typed conversation (ADR 0007 point 4) is the same screen with a smaller
 * orb, a line saying why it is typed, and the thread of lines between the
 * state line and the controls; the microphone toggle goes. An ending replaces
 * only the state lines there, and the thread stays. It is anchored to
 * the top rather than centred: the orb is placed on its slot when the slot
 * changes size, not when it moves, so a thread that grows must not push the
 * slot about.
 *
 * Behind it all is Chấm nhịp, the dotted field her voice moves
 * (`dot-field.ts`): mounted here, centred on the orb's slot, and advanced by
 * the orb's own loop, which this screen reaches through `dotFieldRef`.
 *
 * One more element draws nothing: the container of the Invisible Turnstile
 * widget every call's ticket costs (ADR 0009 point 5), mounted with the dialog
 * in every shape so the widget outlives a slot swap.
 */

const FAST = 'transition-colors duration-[var(--duration-fast)] ease-out'
const ROUND = `grid size-10 flex-none cursor-pointer place-items-center rounded-[50%] border-none ${FAST}`
const IDLE = 'bg-surface-card text-text-body'
const ACTIVE = 'bg-text-heading text-text-on-accent'
const LABEL = 'font-ui text-body-sm leading-(--leading-body) font-medium text-text-muted'
const SLOT_LINE = 'm-0 max-w-[36ch] font-ui text-body-sm leading-(--leading-body) text-text-muted'

interface CallOverlayProps {
  spotRef: RefObject<HTMLDivElement | null>
  /**
   * The orb: a sibling of the dialog left out of the inert page, since it is
   * the call's picture, and where focus goes back to when the call was not
   * opened from anywhere else.
   */
  orbRef: RefObject<HTMLElement | null>
  /** Where the dotted field is handed to the orb's loop while this screen is open. */
  dotFieldRef: RefObject<DotField | null>
}

export function CallOverlay({ spotRef, orbRef, dotFieldRef }: CallOverlayProps) {
  const demo = useCallDemo()
  const { returnFocusTo } = demo
  const [typed, setTyped] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // The slot's line describes its first action, which takes focus when the
  // slot appears, so a screen reader landing there hears why.
  const slotLineId = useId()
  const budgetLineId = useId()
  const threadRef = useRef<HTMLDivElement>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLCanvasElement>(null)
  useDotField(fieldRef, spotRef, dotFieldRef)
  const challenge = useTurnstile(demo.open, turnstileRef)
  const { awaitingConsent, ended, failed, budget } = demo
  /** The server said nothing of the hour is left: no call can start until it turns. */
  const spent = budget !== null && budget.remainingMs <= 0
  const leftLine = budgetLine(budget)
  const showsControls = !awaitingConsent && !ended && !failed
  const typing = demo.input === 'text'
  const lineCount = demo.messages.length

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

  // Declared after the effect above, so on open it runs second and wins over
  // the dialog's own focus. A slot that swaps out takes the focused control
  // with it; focus moves to the new slot's first action, or to the dialog when
  // the slot has none or once a call starts, instead of falling to the page
  // under it. A call that turns typed takes the microphone toggle with it,
  // which may have had focus; the server's answer arriving swaps the ordinary
  // slot for the spent one, and the hour turning swaps it back.
  useEffect(() => {
    if (awaitingConsent || ended || failed) {
      const target = actionsRef.current?.querySelector<HTMLElement>('a, button') ?? dialogRef.current
      target?.focus({ preventScroll: true })
      return
    }
    if (document.activeElement === document.body) dialogRef.current?.focus({ preventScroll: true })
  }, [awaitingConsent, ended, failed, typing, spent])

  // The newest line is the one to read; the thread scrolls inside itself.
  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [lineCount])

  const startCall = () => {
    demo.startCall(challenge)
  }

  const send = () => {
    if (!typed.trim()) return
    demo.ask(typed)
    setTyped('')
  }

  /** The ending of a call that ended on its own, or of one that could not connect; null while neither. */
  const ending = ended ? (
    <div ref={actionsRef} className="flex flex-col items-center gap-4 text-center">
      <p id={slotLineId} role="status" className={SLOT_LINE}>
        {endingLine(ended, budget)}
      </p>
      {/* A dropped connection sends nobody to a form — unless it ended the hour
          the visitor spent talking to Linh, which is the moment to offer the
          waitlist (ADR 0008 point 5). */}
      <div className="flex flex-wrap justify-center gap-3">
        {ended === 'error' && !spent ? null : (
          <Link href="/waitlist" aria-describedby={slotLineId} className={buttonClassName({ variant: 'primary' })}>
            {WAITLIST_LABEL}
          </Link>
        )}
        {spent ? null : (
          <Button
            variant="secondary"
            onClick={startCall}
            aria-describedby={ended === 'error' ? slotLineId : undefined}
          >
            {CALL_AGAIN_LABEL}
          </Button>
        )}
      </div>
    </div>
  ) : failed ? (
    <div ref={actionsRef} className="flex flex-col items-center gap-4 text-center">
      <p id={slotLineId} role="status" className={SLOT_LINE}>
        {CONNECT_FAILED_LINE}
      </p>
      {/* No sign-up link: a visitor the demo failed is not sent to a form. */}
      <Button variant="secondary" onClick={startCall} aria-describedby={slotLineId}>
        {CALL_AGAIN_LABEL}
      </Button>
    </div>
  ) : null

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="outline-none">
      {/* Cloudflare's own markup goes in here; React renders nothing into it. */}
      <div ref={turnstileRef} aria-hidden="true" className="fixed size-0 overflow-clip" />
      <div className="fixed inset-0 isolate z-60 grid grid-rows-[auto_1fr_auto] bg-surface-page px-[clamp(16px,4vw,40px)] pt-5 pb-[clamp(20px,4vh,40px)] motion-safe:animate-[fnFadeIn_320ms_var(--ease-arc)]">
        <canvas
          ref={fieldRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-1 size-full text-text-heading"
        />
        <div className="flex items-center justify-between gap-4">
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 text-ui leading-(--leading-body) text-text-muted">
            <span className="size-2 rounded-[50%] bg-text-eyebrow" />
            <span id={titleId}>Nha khoa Minh Anh · bản mô phỏng</span>
            {/* Its line is reserved from the first frame: the orb is placed on
                its slot when the slot changes size, not when it moves, so a
                header that grew as the call connected would leave it off. */}
            <div className="col-start-2 min-h-[1lh]">
              {demo.endsAt === null ? null : <CallCountdown key={demo.endsAt} endsAt={demo.endsAt} />}
            </div>
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

        <div
          className={
            typing
              ? 'flex min-h-0 flex-col items-center gap-6 pt-4'
              : 'grid place-items-center content-center gap-[60px]'
          }
        >
          {/* Wide gap: the dotted field opens around the orb without crowding the
              label. Typed, the orb is smaller and gives its room to the thread. */}
          <div
            ref={spotRef}
            aria-hidden="true"
            className={typing ? 'size-[clamp(120px,18vh,180px)] flex-none' : 'size-[clamp(200px,32vh,320px)]'}
          />
          {awaitingConsent && spent ? (
            <div ref={actionsRef} className="flex flex-col items-center gap-4 text-center">
              <p id={slotLineId} className={SLOT_LINE}>
                {spentLine(budget.waitMs)}
              </p>
              <Link href="/waitlist" aria-describedby={slotLineId} className={buttonClassName({ variant: 'primary' })}>
                {WAITLIST_LABEL}
              </Link>
            </div>
          ) : awaitingConsent ? (
            <div ref={actionsRef} className="flex flex-col items-center gap-4 text-center">
              <p id={slotLineId} className={SLOT_LINE}>
                {CONSENT_LINE}
              </p>
              {leftLine === null ? null : (
                <p id={budgetLineId} className={SLOT_LINE}>
                  {leftLine}
                </p>
              )}
              <Button
                variant="primary"
                onClick={startCall}
                aria-describedby={leftLine === null ? slotLineId : `${slotLineId} ${budgetLineId}`}
              >
                {START_LABEL}
              </Button>
            </div>
          ) : typing ? (
            // An ending replaces the state lines only: in a typed conversation
            // the thread is what the visitor came for, so it stays (ADR 0007).
            <div className="flex min-h-0 w-[min(560px,100%)] flex-col items-center gap-4">
              {ending ?? (
                <div className="flex flex-col items-center gap-1 text-center">
                  <div role="status" className={`min-h-[22px] ${LABEL}`}>
                    {stateLabel(demo.agent, demo.mic, 'text')}
                  </div>
                  <p className={`m-0 max-w-[36ch] ${LABEL}`}>{TEXT_MODE_LINE}</p>
                </div>
              )}
              {/* Kept while the conversation runs, empty or not, so the live
                  region exists before her first line arrives. */}
              {ending && lineCount === 0 ? null : (
                <div
                  ref={threadRef}
                  aria-live="polite"
                  className="flex min-h-0 w-full flex-col gap-3 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {demo.messages.map((line) => (
                    <ThreadTurn key={line.id} line={line} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            ending ?? (
              <div className="flex flex-col items-center gap-1 text-center">
                {/* Kept at its height while empty, which a call mostly is: the
                    orb follows its slot only when the slot changes size. */}
                <div role="status" className={`min-h-[22px] ${LABEL}`}>
                  {stateLabel(demo.agent, demo.mic, 'voice')}
                </div>
              </div>
            )
          )}
        </div>

        {/* Reserves room under the orb for the controls, which are fixed. Kept
            while they are hidden, so the orb stays where it was. Typed, the
            footnote is longer and wraps to a second line on a phone. */}
        <div className={typing ? 'h-[192px]' : 'h-[170px]'} />
      </div>

      {showsControls ? (
        <div className="fixed bottom-[clamp(20px,4vh,40px)] left-1/2 z-80 flex w-[min(760px,calc(100vw-32px))] -translate-x-1/2 flex-col items-center gap-4 motion-safe:animate-[fnFadeIn_420ms_var(--ease-arc)_120ms_both]">
          {/* The dialog, not the typed line, when the chips run out under
              focus: focusing an input would open a phone's keyboard. */}
          <CallChips ask={demo.ask} fallbackFocus={dialogRef} />

          <div className="flex w-full items-center gap-2.5 rounded-pill bg-surface-card py-2.5 pr-3 pl-[22px] shadow-[inset_0_0_0_1px_var(--border-hairline),var(--shadow-overlay)]">
            {/* The pill carries the hairline and the shadow; the global
                :focus-visible ring would draw a square inside it. */}
            <input
              placeholder={typing ? TEXT_PLACEHOLDER : 'Gõ câu hỏi nếu bạn không muốn nói…'}
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
                demo.noteActivity()
              }}
              onKeyDown={(e) => {
                // Enter that confirms a Vietnamese IME composition is not a send.
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
                e.preventDefault()
                send()
              }}
              className="min-w-0 flex-1 border-none bg-transparent font-ui text-body-sm text-text-body outline-none placeholder:text-text-muted focus-visible:outline-none"
            />

            {typing ? null : (
              <button
                type="button"
                onClick={demo.toggleMic}
                aria-label="Bật tắt micro"
                aria-pressed={!demo.mic}
                className={`${ROUND} ${demo.mic ? IDLE : ACTIVE}`}
              >
                <Icon name={demo.mic ? 'voice' : 'voice-off'} size={18} />
              </button>
            )}

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
            {typing ? TEXT_FOOTNOTE : 'Fonnus luôn trả lời bằng giọng nói. Bấm ✕ để thoát.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/**
 * One line of a typed conversation, in the landing page's one transcript shape:
 * the turns of the "Khả năng" sample calls (`call-demo-player.tsx`), whose
 * classes these repeat. Her lines sit on blush, because blush means speech.
 */
function ThreadTurn({ line }: { line: ThreadLine }) {
  const hers = line.from === 'agent'
  return (
    <div
      className={[
        'max-w-[92%] rounded-md px-[15px] py-[13px] max-[561px]:max-w-full',
        'motion-safe:animate-[fnRise_320ms_var(--ease-out)_both]',
        hers ? 'self-end bg-surface-warm' : 'self-start bg-surface-page shadow-[inset_0_0_0_1px_var(--border-hairline)]',
      ].join(' ')}
    >
      <span
        className={`mb-[5px] block text-eyebrow leading-(--leading-body) font-semibold tracking-[0.06em] uppercase ${hers ? 'text-text-accent' : 'text-text-muted'}`}
      >
        {SPEAKER_LABELS[line.from]}
      </span>
      <p className="m-0 text-body-sm leading-[1.55] text-text-body">{line.text}</p>
    </div>
  )
}

/**
 * Mounts the dotted field on its canvas and hands it to the orb's loop. It is
 * re-laid out whenever the canvas or the orb's slot changes size; an
 * observer's first report, which `observe()` always delivers, draws the
 * resting field.
 */
function useDotField(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  spotRef: RefObject<HTMLElement | null>,
  dotFieldRef: RefObject<DotField | null>,
) {
  useEffect(() => {
    const canvas = canvasRef.current
    const spot = spotRef.current
    if (!canvas || !spot) return
    const field = createDotField(canvas, spot)
    if (!field) return
    const resized = new ResizeObserver(field.layout)
    resized.observe(canvas)
    resized.observe(spot)
    dotFieldRef.current = field
    return () => {
      resized.disconnect()
      dotFieldRef.current = null
    }
  }, [canvasRef, spotRef, dotFieldRef])
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
