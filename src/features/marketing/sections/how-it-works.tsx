import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '@/design-system'
import type { IconName } from '@/design-system'
import { ForwardVisual, LiveCallVisual, SetupVisual } from './how-it-works-visuals'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, SECTION_INNER } from './section-chrome'

interface Step {
  icon: IconName
  eyebrow: string
  title: string
  body: string
  scene: ReactNode
}

const STEPS: Step[] = [
  {
    icon: 'settings',
    eyebrow: 'Bước 1 · 2 phút',
    title: 'Đăng ký và thiết lập trợ lý',
    body: 'Tạo tài khoản, khai thông tin phòng khám và bảng giá dịch vụ — trợ lý trả lời đúng theo dữ liệu của bạn.',
    scene: <SetupVisual />,
  },
  {
    icon: 'incoming',
    eyebrow: 'Bước 2 · 3 phút',
    title: 'Cài số điện thoại',
    body: 'Dùng số Fonnus cấp, hoặc chuyển tiếp cuộc gọi từ số hiện tại của phòng khám sang Fonnus.',
    scene: <ForwardVisual />,
  },
  {
    icon: 'answered',
    eyebrow: 'Bước 3 · từ đây, 24/7',
    title: 'Bệnh nhân gọi, Fonnus trả lời',
    body: 'Đặt lịch, báo giá và hỗ trợ 24/7 bằng tiếng Việt tự nhiên.',
    scene: <LiveCallVisual />,
  },
]

/*
 * One height for all three cards: a stack whose cards differ in height shows a
 * different sliver of each, and the ragged edge reads as untidy rather than as
 * a deck. On two columns the floor is the tallest scene at the narrowest
 * two-column width; above it the card takes a share of the viewport so it
 * still pins with the header cleared.
 *
 * Under 1024px the halves stack and the card is capped to what a screen can
 * hold, because a card taller than the viewport cannot pin — its lower half is
 * never reachable once the next card slides over it. The deepest card pins at
 * `--pin-top` plus two steps, so that plus the card has to clear the screen;
 * the spare 8px is all the slack there is. A tablet-width pane lays most rows on
 * one line, so it gets a fixed shorter card than a phone.
 *
 * Breakpoints are `max-[N+1px]` for the reason given in how-it-works-visuals.tsx.
 */
const STACK = [
  'flex flex-col gap-[clamp(28px,5vh,48px)] max-[1024px]:gap-5',
  '[--card-h:clamp(570px,62vh,605px)] [--card-step:14px] [--pin-top:112px]',
  'max-[1024px]:[--card-step:10px] max-[1024px]:[--pin-top:76px]',
  'max-[1024px]:[--card-h:min(700px,calc(100dvh_-_var(--pin-top)_-_2*var(--card-step)_-_8px))]',
  '[@media(min-width:561px)_and_(max-width:1023px)]:[--card-h:670px]',
].join(' ')

/*
 * Each slot pins one step lower than the one before it, which is what leaves a
 * sliver of the card underneath and makes the stack legible as a stack. The
 * deck flattens into a plain list wherever a whole card cannot fit: a screen
 * under 700px tall, a short tablet, a phone under 360px wide — and under
 * reduced motion.
 */
const SLOT = [
  'sticky top-[calc(var(--pin-top)_+_var(--i)_*_var(--card-step))]',
  'max-[360px]:static [@media(max-height:700px)]:static motion-reduce:static',
  '[@media(min-width:561px)_and_(max-width:1023px)_and_(max-height:780px)]:static',
].join(' ')

const CARD = [
  'relative box-border grid h-(--card-h) grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] items-stretch gap-[clamp(24px,4vw,48px)]',
  'rounded-lg bg-surface-page p-[clamp(24px,3.5vw,40px)]',
  // The upward shadow is what makes an incoming card read as sliding OVER the one beneath.
  'shadow-[inset_0_0_0_1px_var(--border-hairline),0_-14px_34px_color-mix(in_srgb,var(--text-heading)_10%,transparent),0_24px_60px_color-mix(in_srgb,var(--text-heading)_10%,transparent)]',
  'max-[1024px]:grid-cols-1 max-[1024px]:grid-rows-[auto_minmax(0,1fr)] max-[1024px]:gap-4 max-[1024px]:p-[18px]',
  'max-[561px]:gap-3.5 max-[561px]:p-4',
  'max-[360px]:h-auto [@media(max-width:1023px)_and_(max-height:700px)]:h-auto',
].join(' ')

/* On a phone the step mark moves up onto the eyebrow's line, which buys the
   scene below about 30px of the card's height. */
const COPY = [
  'flex flex-col items-start justify-center',
  'max-[1024px]:justify-start max-[1024px]:pr-11',
  'max-[561px]:grid max-[561px]:grid-cols-[auto_minmax(0,1fr)] max-[561px]:items-center max-[561px]:gap-x-3',
].join(' ')

const BULLET = [
  'mb-[22px] grid size-[52px] flex-none place-items-center rounded-[50%]',
  'max-[1024px]:mb-3 max-[1024px]:size-10',
  'max-[561px]:col-start-1 max-[561px]:row-start-1 max-[561px]:mb-0 max-[561px]:size-[38px]',
].join(' ')
const BULLET_QUIET = `${BULLET} bg-surface-warm text-text-accent`
/* The step where Fonnus is actually live gets the filled mark; on a terracotta
   ground the accent would vanish, so the icon goes one colour. */
const BULLET_LIVE = `${BULLET} bg-action-primary text-text-on-accent [--icon-accent:currentColor] shadow-[0_10px_24px_color-mix(in_srgb,var(--action-primary)_28%,transparent)]`

/*
 * The counter moves into the card's corner under 1024px rather than costing a
 * line at the bottom: every pixel of the card's height is spent buying the pin.
 */
const COUNT = [
  'mt-auto pt-6 font-num text-ui leading-(--leading-body) tabular-nums text-text-muted',
  'max-[1024px]:absolute max-[1024px]:top-[18px] max-[1024px]:right-[18px] max-[1024px]:m-0 max-[1024px]:p-0',
  'max-[561px]:top-4 max-[561px]:right-4',
].join(' ')

/**
 * "Cách hoạt động": a sticky stack. Each step pins under the header and the
 * next slides up over it, leaving a sliver of the one below, so the steps are
 * met one at a time; each card's other half plays out what that step looks
 * like. A server component — the scenes' one client leaf is `PlayWhenSeen`.
 */
export function HowItWorks() {
  return (
    <section id="cach-hoat-dong" className={`${SECTION_BAND} bg-surface-card`}>
      <div className={SECTION_INNER}>
        <div data-reveal="0" className={SECTION_EYEBROW}>
          Cách hoạt động
        </div>
        <h2 data-reveal="1" className={`${SECTION_HEADING} mb-[clamp(32px,5vh,56px)] max-w-[22ch]`}>
          Sẵn sàng nhận cuộc gọi trong chưa đầy 5 phút
        </h2>

        <div className={STACK}>
          {STEPS.map((step, i) => (
            <div key={step.title} className={SLOT} style={{ '--i': i } as CSSProperties}>
              <article className={CARD}>
                <div className={COPY}>
                  <span className={i === STEPS.length - 1 ? BULLET_LIVE : BULLET_QUIET}>
                    <Icon name={step.icon} size={22} />
                  </span>
                  <div className="mb-3 text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-eyebrow uppercase max-[1024px]:mb-2 max-[561px]:col-start-2 max-[561px]:row-start-1 max-[561px]:mb-0">
                    {step.eyebrow}
                  </div>
                  <h3 className="m-0 mb-3.5 font-display text-[length:clamp(22px,2.4vw,32px)] leading-[1.25] font-semibold tracking-display text-balance text-text-heading max-[1024px]:mb-2.5 max-[1024px]:text-[length:clamp(20px,5.4vw,26px)] max-[561px]:col-span-full max-[561px]:row-start-2 max-[561px]:mt-3.5">
                    {step.title}
                  </h3>
                  <p className="m-0 max-w-[38ch] text-body leading-[1.65] text-text-muted max-[1024px]:text-body-sm max-[1024px]:leading-[1.55] max-[561px]:col-span-full max-[561px]:row-start-3">
                    {step.body}
                  </p>
                  <span className={COUNT}>
                    {i + 1} / {STEPS.length}
                  </span>
                </div>

                <div className="flex h-full min-w-0 items-stretch">{step.scene}</div>
              </article>
            </div>
          ))}
          {/*
            Scroll runway under the last card. A real element, not padding on
            the stack: a sticky item is bounded by its parent's content box,
            which padding does not extend — with padding alone the third card
            never reaches its pin and the first releases early.
          */}
          <div aria-hidden="true" className="h-[clamp(180px,50vh,520px)] flex-none" />
        </div>
      </div>
    </section>
  )
}
