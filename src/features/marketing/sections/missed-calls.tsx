import Link from 'next/link'
import { Icon, Shape, buttonClassName } from '@/design-system'
import type { IconName } from '@/design-system'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, SECTION_INNER } from './section-chrome'

interface Step {
  icon: IconName
  when: string
  what: string
}

/*
 * The same call, twice — once as it goes today, once with Fonnus. Two parallel
 * three-step tracks instead of a time-axis chart: a clinic owner reads a
 * before/after at a glance, where an axis with bands and a legend has to be
 * decoded first.
 */
const TODAY: Step[] = [
  { icon: 'after-hours', when: '20:15', what: 'Khách gọi sau giờ làm' },
  { icon: 'missed', when: 'Máy reo', what: 'Không có ai nghe' },
  { icon: 'caller-lost', when: '20:16', what: 'Khách gọi nơi khác' },
]

const WITH_FONNUS: Step[] = [
  { icon: 'after-hours', when: '20:15', what: 'Khách gọi sau giờ làm' },
  { icon: 'answered', when: '3 hồi chuông', what: 'Fonnus nghe máy' },
  { icon: 'appointment', when: '20:17', what: 'Lịch hẹn vào sổ' },
]

type Variant = 'today' | 'fonnus'

/*
 * Two tracks, deliberately the same shape so the only thing that differs is
 * the ending. Today is flat and unlit — nothing there is working for the
 * clinic; with Fonnus is the warm ground, the only lit path on the page.
 */
const TRACK: Record<Variant, string> = {
  today: 'bg-surface-card shadow-[inset_0_0_0_1px_var(--border-hairline)]',
  fonnus: 'bg-surface-warm shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-eyebrow)_18%,transparent)]',
}

const TRACK_LABEL: Record<Variant, string> = { today: 'text-text-muted', fonnus: 'text-text-accent' }
const TRACK_DOT: Record<Variant, string> = { today: 'bg-text-muted', fonnus: 'bg-text-eyebrow' }
const STEP_WHEN: Record<Variant, string> = { today: 'text-text-muted', fonnus: 'text-text-accent' }
const ARROW: Record<Variant, string> = {
  today: 'text-border-strong',
  fonnus: 'text-[color-mix(in_srgb,var(--text-eyebrow)_50%,transparent)]',
}
const OUTCOME: Record<Variant, string> = {
  today: 'border-border-hairline text-text-muted',
  fonnus: 'border-[color-mix(in_srgb,var(--text-eyebrow)_18%,transparent)] font-medium text-text-body',
}

/* The filled mark on a terracotta ground goes one colour, or its accent vanishes into it. */
const FILLED_ICON =
  'bg-action-primary text-text-on-accent [--icon-accent:currentColor] shadow-[0_8px_20px_color-mix(in_srgb,var(--action-primary)_24%,transparent)]'

/*
 * Each step's icon, by position. The moment it goes wrong and the moment it
 * goes right both get the accent; the caller who went elsewhere is an empty
 * outline.
 */
const STEP_ICON: Record<Variant, [string, string, string]> = {
  today: [
    'bg-surface-page text-text-muted shadow-[inset_0_0_0_1px_var(--border-hairline)]',
    'bg-surface-rose text-error [--icon-accent:currentColor]',
    'border-[1.5px] border-dashed border-border-strong bg-transparent text-text-muted',
  ],
  fonnus: [
    'bg-surface-card text-text-accent shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-eyebrow)_20%,transparent)]',
    FILLED_ICON,
    FILLED_ICON,
  ],
}

/**
 * "Cái giá của một cuộc gọi nhỡ" — why this is a problem worth solving, and a
 * way to the prices. A server component with no client state.
 */
export function MissedCalls() {
  return (
    <section id="vi-sao" className={SECTION_BAND}>
      <div className={SECTION_INNER}>
        <div className="mb-11 flex items-end justify-between gap-8">
          <div>
            <div data-reveal="0" className={SECTION_EYEBROW}>
              Cái giá của một cuộc gọi nhỡ
            </div>
            <h2 data-reveal="1" className={`${SECTION_HEADING} mb-5 max-w-[26ch]`}>
              Người gọi không để lại lời nhắn. Họ gọi phòng khám tiếp theo.
            </h2>
            <p data-reveal="2" className="m-0 max-w-[60ch] text-body-lg text-text-muted">
              Cùng một cuộc gọi lúc 8 giờ tối — hai kết cục khác nhau.
            </p>
          </div>
          {/* "Cuộc gọi được trả lời", drawn before it is argued. It sits on the
              heading's baseline, and only where there is room beside a 26ch heading. */}
          <div data-reveal="2" className="-mb-1.5 flex-none text-text-heading max-[901px]:hidden">
            <Shape name="rising-arcs" size={176} />
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-5">
          <Track
            variant="today"
            label="Hôm nay"
            steps={TODAY}
            outcome="Bỏ lỡ 1 khách hàng — và không có gì ghi lại để bạn biết."
          />
          <Track
            variant="fonnus"
            label="Với Fonnus"
            steps={WITH_FONNUS}
            outcome="Sáng mai mở máy, lịch hẹn đã nằm sẵn trong sổ."
          />
        </div>

        {/* Night: the one place in this section that has to stop the eye.
            `data-theme="dark"` turns the icon accent to the night terracotta. */}
        <div
          data-reveal="0"
          data-theme="dark"
          className="flex flex-wrap items-center justify-between gap-6 rounded-lg bg-surface-inverse p-7 text-text-on-inverse"
        >
          <div className="flex min-w-0 flex-[1_1_320px] items-center gap-[22px]">
            {/* The closed ring: no hour of the day left empty. Kept on phones: the
                prototype's stylesheet hid it below 620px, but an inline display
                overrode that, and the screen it shipped shows the ring. */}
            <Shape name="always-on" size={84} />
            {/* No measure cap: at 34ch the sentence broke before "mỗi tháng". */}
            <div className="font-display text-[length:clamp(20px,2.2vw,var(--size-heading))] leading-[1.3] font-semibold text-text-on-inverse">
              Fonnus nghe máy 24/7, từ 2.500.000 đ mỗi tháng.
            </div>
          </div>
          <Link href="/#bang-gia" className={buttonClassName({ variant: 'inverse' })}>
            Xem bảng giá
          </Link>
        </div>
      </div>
    </section>
  )
}

interface TrackProps {
  variant: Variant
  label: string
  steps: Step[]
  outcome: string
}

/*
 * Breakpoints are `max-[N+1px]` for the reason given in how-it-works-visuals.tsx:
 * 900px tightens the row of three, 620px turns it into a vertical list with the
 * arrows pointing down, and the narrower one has to win.
 */
function Track({ variant, label, steps, outcome }: TrackProps) {
  return (
    <div
      data-reveal={variant === 'fonnus' ? '1' : '0'}
      className={`rounded-lg p-[clamp(20px,3vw,28px)] ${TRACK[variant]}`}
    >
      <div
        className={`mb-5 flex items-center gap-[9px] font-ui text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow uppercase ${TRACK_LABEL[variant]}`}
      >
        <span aria-hidden="true" className={`size-[9px] rounded-[50%] ${TRACK_DOT[variant]}`} />
        {label}
      </div>

      <ol className="m-0 grid list-none grid-cols-3 gap-3 p-0 max-[621px]:grid-cols-1 max-[621px]:gap-[26px]">
        {steps.map((step, i) => (
          // Each step is its own grid — icon, time, label — so the steps line
          // up row for row across both tracks and the eye compares straight down.
          <li
            key={step.what}
            className={[
              'relative grid grid-rows-[auto_auto_auto] justify-items-center gap-2 px-[clamp(6px,2vw,18px)] text-center',
              'max-[901px]:px-1',
              'max-[621px]:grid-cols-[56px_minmax(0,1fr)] max-[621px]:grid-rows-[auto_auto] max-[621px]:items-center max-[621px]:justify-items-start',
              'max-[621px]:gap-x-3.5 max-[621px]:gap-y-0.5 max-[621px]:px-0 max-[621px]:text-left',
            ].join(' ')}
          >
            <span
              className={`grid size-14 place-items-center rounded-[50%] max-[901px]:size-12 max-[621px]:row-span-2 ${STEP_ICON[variant][i] ?? ''}`}
            >
              <Icon name={step.icon} size={22} />
            </span>
            <span
              className={`font-num text-ui leading-(--leading-body) font-medium tabular-nums ${STEP_WHEN[variant]}`}
            >
              {step.when}
            </span>
            <span className="font-display text-[length:clamp(16px,1.5vw,20px)] leading-[1.3] font-semibold text-balance text-text-heading">
              {step.what}
            </span>

            {/* In the gutter between steps, centred on the icon row; turned
                to point down once the steps stack. */}
            {i < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={[
                  'absolute top-7 -right-3 grid -translate-y-1/2 place-items-center',
                  'max-[901px]:-right-[9px]',
                  'max-[621px]:top-auto max-[621px]:right-auto max-[621px]:-bottom-5 max-[621px]:left-7 max-[621px]:-translate-x-1/2 max-[621px]:translate-y-0 max-[621px]:rotate-90',
                  ARROW[variant],
                ].join(' ')}
              >
                <Icon name="arrow-right" size={18} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <p className={`m-0 mt-[22px] border-t pt-[18px] text-center text-body leading-[1.6] ${OUTCOME[variant]}`}>
        {outcome}
      </p>
    </div>
  )
}
