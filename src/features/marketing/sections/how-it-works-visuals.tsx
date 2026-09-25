import type { CSSProperties } from 'react'
import { Icon } from '@/design-system'
import { PlayWhenSeen } from './play-when-seen'

/*
 * Three small scenes, one per step of "Cách hoạt động", each playing once when
 * its card first settles on screen. The markup is server-rendered; the only
 * client code is `PlayWhenSeen`, whose `data-waiting` / `data-played` the
 * elements below key their motion off (`in-data-*`).
 *
 * An element's resting style is its FINISHED state, and every keyframe states
 * its own start (globals.css). A scene that never plays — reduced motion, no
 * JavaScript, one already on screen when the page came up — reads complete.
 *
 * Breakpoints are Tailwind's `max-[N+1px]`, not `[@media(max-width:Npx)]`:
 * several of them touch the same property here, and Tailwind orders `max-*` by
 * value (the narrower one wins) but arbitrary media variants alphabetically,
 * which would let 900px override 560px.
 */

/** Held at its start state until the scene plays. */
const HIDDEN = 'motion-safe:in-data-waiting:opacity-0'
const RISE = `${HIDDEN} motion-safe:in-data-played:animate-[fnSceneRise_520ms_var(--ease-out)_var(--delay)_both]`
const RISE_QUICK = `${HIDDEN} motion-safe:in-data-played:animate-[fnSceneRise_480ms_var(--ease-out)_var(--delay)_both]`
const FADE = `${HIDDEN} motion-safe:in-data-played:animate-[fnFadeIn_620ms_var(--ease-out)_var(--delay)_both]`

/** A `--delay` carrier; every scene element schedules itself off this. */
function at(ms: number): CSSProperties {
  return { '--delay': `${String(ms)}ms` } as CSSProperties
}

/* Fills the card's visual column rather than sizing to its content: three
   panes sharing one outer box is what lets the three cards share one height. */
const SCENE = 'flex h-full min-w-0 flex-auto items-stretch justify-center'

const PANE = [
  'box-border flex w-full flex-col rounded-lg bg-surface-card p-5 max-[1024px]:p-4',
  'shadow-[inset_0_0_0_1px_var(--border-hairline),0_16px_40px_color-mix(in_srgb,var(--text-heading)_8%,transparent)]',
].join(' ')

const PANE_HEAD =
  'mb-4 flex items-center gap-2 text-eyebrow leading-(--leading-body) font-semibold tracking-[0.06em] text-text-accent uppercase max-[1024px]:mb-3'

/* The rows spread through the pane rather than clustering in its middle. */
const PANE_BODY = 'flex min-h-0 flex-auto flex-col justify-between'

/* A status chip hugs its text: stretched by the pane's column it would read as a button. */
const CHIP = [
  'inline-flex items-center gap-2 self-start rounded-pill bg-action-primary px-3.5 py-2.5 max-[1024px]:px-[13px] max-[1024px]:py-[9px]',
  'text-body-sm leading-(--leading-body) font-medium text-text-on-accent [--icon-accent:currentColor]',
  RISE,
].join(' ')

/* Both chips carry a full sentence that wraps on a phone and stops reading as a
   chip, so the narrow screens get the half that carries the news. */
const CHIP_LONG = 'max-[561px]:hidden'
const CHIP_SHORT = 'hidden max-[561px]:inline'

const PRICE_ROWS = [
  { name: 'Khám tổng quát', price: '150.000 đ' },
  { name: 'Cạo vôi răng', price: '300.000 đ' },
  { name: 'Trám răng', price: 'từ 400.000 đ' },
  { name: 'Tẩy trắng răng', price: 'từ 1.500.000 đ' },
]

const FIELD_LABEL = 'mb-[5px] block text-ui leading-(--leading-body) text-text-muted'
const FIELD_BOX =
  'block overflow-clip rounded-sm bg-surface-page px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--border-hairline)] max-[1024px]:px-[11px] max-[1024px]:py-2'
/* The value fades in already sitting in the field: a left-to-right reveal read
   as a stutter rather than as typing. */
const FIELD_VALUE = `block truncate text-body-sm leading-(--leading-body) font-medium text-text-body ${FADE}`

/** Step 1 — the clinic's own details, then its price list, easing into place. */
export function SetupVisual() {
  return (
    <PlayWhenSeen className={SCENE}>
      <div className={PANE}>
        <div className={PANE_HEAD}>
          <Icon name="settings" size={15} />
          Thông tin phòng khám
        </div>

        <div className={PANE_BODY}>
          <div className="mb-3 max-[1024px]:mb-2.5">
            <span className={FIELD_LABEL}>Tên phòng khám</span>
            <span className={FIELD_BOX}>
              <span className={FIELD_VALUE} style={at(160)}>
                Nha khoa Minh Anh
              </span>
            </span>
          </div>

          <div className="mb-3 max-[1024px]:mb-2.5">
            <span className={FIELD_LABEL}>Địa chỉ</span>
            <span className={FIELD_BOX}>
              <span className={FIELD_VALUE} style={at(320)}>
                12 Nguyễn Huệ, Q.1, TP.HCM
              </span>
            </span>
          </div>

          <div>
            <div className="mb-2 text-ui leading-(--leading-body) text-text-muted max-[1024px]:mb-1.5">
              Bảng giá dịch vụ
            </div>
            <div className="flex flex-col gap-1">
              {PRICE_ROWS.map(({ name, price }, i) => (
                <span
                  key={name}
                  className={`flex items-center justify-between gap-3 rounded-sm bg-surface-page px-3 py-2.5 text-body-sm leading-(--leading-body) text-text-body max-[1024px]:px-[11px] ${RISE}`}
                  style={at(560 + i * 130)}
                >
                  <span>{name}</span>
                  <span className="font-num font-semibold tabular-nums text-text-accent">{price}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PlayWhenSeen>
  )
}

/*
 * The pool a clinic picks from during onboarding. Fonnus buys fixed-line
 * numbers in bulk and the tenant takes one at no charge, so the scene shows a
 * short list with one taken rather than a number handed down.
 */
const FONNUS_NUMBERS = [
  { number: '028 7300 8386', chosen: true },
  { number: '028 7300 8388' },
  /* Two options already read as a pool to pick from, and a phone card only has
     the height the screen gives it, so the third is shown where there is room. */
  { number: '028 7300 1246', wideOnly: true },
]

/*
 * One card per route. Both are ordinary choices, so both get the same card:
 * neither is the recommended one, and the point of the scene is that there are
 * exactly two. The two share the pane's spare height and spend it on their own
 * inner gaps rather than pooling it in one slab between them.
 */
const WAY = [
  'flex flex-auto flex-col justify-between rounded-md bg-surface-page p-[13px] shadow-[inset_0_0_0_1px_var(--border-hairline)]',
  'max-[1024px]:p-[11px] max-[561px]:px-2.5 max-[561px]:py-[11px]',
  RISE,
].join(' ')

const WAY_HEAD =
  'mb-2.5 flex items-center gap-2 text-body-sm leading-(--leading-body) font-semibold text-text-body max-[1024px]:mb-2 max-[561px]:mb-2.5'

const WAY_BADGE =
  'flex-none rounded-pill bg-surface-warm px-2 py-[3px] text-eyebrow leading-(--leading-body) font-semibold tracking-[0.06em] text-text-accent uppercase'

const WAY_NOTE =
  'm-0 mt-2.5 text-ui leading-[1.45] text-text-muted max-[1024px]:mt-2 max-[1024px]:leading-[1.4] max-[561px]:mt-[9px]'

const NUMBER = [
  'flex items-center justify-between gap-2.5 rounded-sm px-[11px] py-2 max-[1024px]:px-2.5 max-[1024px]:py-[7px]',
  'font-num text-body-sm leading-(--leading-body) font-semibold tabular-nums text-text-body',
].join(' ')
const NUMBER_PLAIN = `${NUMBER} bg-surface-card shadow-[inset_0_0_0_1px_var(--border-hairline)] ${RISE_QUICK}`
/* The chosen number lands with the rest and is picked a beat later, so the list
   reads as a list first and a choice second. Its resting style is the picked one. */
const NUMBER_CHOSEN = [
  NUMBER,
  'bg-surface-warm shadow-[inset_0_0_0_1.5px_var(--text-eyebrow)]',
  HIDDEN,
  'motion-safe:in-data-played:animate-[fnSceneRise_480ms_var(--ease-out)_var(--delay)_both,fnScenePick_420ms_var(--ease-out)_980ms_both]',
].join(' ')

const NUMBER_TAG = [
  'font-ui text-eyebrow leading-(--leading-body) font-semibold tracking-[0.06em] normal-nums text-text-accent uppercase',
  HIDDEN,
  'motion-safe:in-data-played:animate-[fnFadeIn_420ms_var(--ease-out)_1060ms_both]',
].join(' ')

/* Both ends of the redirect are 028 numbers, a good deal wider than the row
   can carry on a phone without tightening. */
const NUM_BOX = [
  'min-w-0 flex-[0_1_auto] rounded-sm px-[11px] py-[9px] max-[561px]:p-2',
  'font-num text-body-sm leading-(--leading-body) font-semibold whitespace-nowrap tabular-nums max-[561px]:text-ui',
  RISE_QUICK,
].join(' ')

/**
 * Step 2 — the two ways a clinic gets onto Fonnus, side by side, because the
 * choice between them is the whole of this step:
 *
 *   1. Take a number from the Fonnus pool and publish it. Whoever rings it
 *      reaches the assistant.
 *   2. Keep the hotline already on the door and the website, and point it at
 *      the Fonnus number with a redirect on the exchange. Callers dial what
 *      they always dialled and land in the same place.
 */
export function ForwardVisual() {
  return (
    <PlayWhenSeen className={SCENE}>
      <div className={PANE}>
        <div className={PANE_HEAD}>
          <Icon name="answered" size={15} />
          Hai cách bắt đầu
        </div>

        {/* Its own gap above the chip: the routes absorb the spare height, not space-between. */}
        <div className={`${PANE_BODY} gap-3`}>
          <div className="flex min-h-0 flex-auto flex-col gap-2.5">
            <div className={WAY} style={at(120)}>
              <div className={WAY_HEAD}>
                <span className={WAY_BADGE}>Cách 1</span>
                Dùng số Fonnus cấp
              </div>

              <div className="flex flex-col gap-[5px] max-[561px]:gap-1">
                {FONNUS_NUMBERS.map(({ number, chosen, wideOnly }, i) => (
                  <span
                    key={number}
                    className={chosen ? NUMBER_CHOSEN : `${NUMBER_PLAIN} ${wideOnly ? 'max-[561px]:hidden' : ''}`}
                    style={at(280 + i * 100)}
                  >
                    <span>{number}</span>
                    {chosen ? <span className={NUMBER_TAG}>Đã chọn</span> : null}
                  </span>
                ))}
              </div>

              <p className={WAY_NOTE}>In số này lên website và biển hiệu phòng khám.</p>
            </div>

            <div className={WAY} style={at(1150)}>
              <div className={WAY_HEAD}>
                <span className={WAY_BADGE}>Cách 2</span>
                Giữ số hiện tại
              </div>

              <div className="flex items-center gap-1 max-[561px]:gap-0.5 max-[360px]:flex-col max-[360px]:items-stretch max-[360px]:gap-0">
                <span
                  className={`${NUM_BOX} bg-surface-card text-text-body shadow-[inset_0_0_0_1px_var(--border-hairline)]`}
                  style={at(1270)}
                >
                  028 3822 1234
                </span>

                {/*
                  The connector is drawn on a real box — left to right in the
                  row, top to bottom under 360px where the two numbers stack.
                  Rotating the box itself smears the line across the card, so
                  only the arrow turns, on `rotate` rather than `transform` so
                  the entrance does not undo it. At that width the arrow fades
                  in place instead of lifting.
                */}
                <span
                  aria-hidden="true"
                  className="relative grid flex-[0_0_40px] place-items-center max-[561px]:flex-[0_0_26px] max-[360px]:w-full max-[360px]:flex-[0_0_30px] max-[360px]:items-end max-[360px]:justify-items-center"
                >
                  <span
                    className={[
                      'absolute top-1/2 right-3.5 left-0 -mt-[0.75px] h-[1.5px] origin-left bg-text-eyebrow',
                      'max-[360px]:top-0 max-[360px]:right-auto max-[360px]:bottom-[13px] max-[360px]:left-1/2 max-[360px]:mt-0 max-[360px]:-ml-[0.75px] max-[360px]:h-auto max-[360px]:w-[1.5px] max-[360px]:origin-top',
                      '[--wire-draw:fnDrawX] max-[360px]:[--wire-draw:fnDrawY]',
                      HIDDEN,
                      'motion-safe:in-data-played:animate-[var(--wire-draw)_620ms_var(--ease-out)_var(--delay)_both]',
                    ].join(' ')}
                    style={at(1420)}
                  />
                  <span
                    className={[
                      'relative grid place-items-center text-text-eyebrow max-[360px]:rotate-90',
                      '[--wire-head-in:fnSceneRise] max-[360px]:[--wire-head-in:fnFadeIn]',
                      HIDDEN,
                      'motion-safe:in-data-played:animate-[var(--wire-head-in)_380ms_var(--ease-out)_var(--delay)_both]',
                    ].join(' ')}
                    style={at(1640)}
                  >
                    <Icon name="arrow-right" size={16} />
                  </span>
                </span>

                {/* The Fonnus end of the redirect, where the call actually lands. */}
                <span
                  className={`${NUM_BOX} bg-surface-warm text-text-accent shadow-[inset_0_0_0_1.5px_var(--text-eyebrow)]`}
                  style={at(1660)}
                >
                  028 7300 8386
                </span>
              </div>

              <p className={WAY_NOTE}>Cài chuyển hướng trên tổng đài — khách vẫn gọi số cũ.</p>
            </div>
          </div>

          <div className={CHIP} style={at(1980)}>
            <Icon name="privacy" size={15} />
            <span className={CHIP_LONG}>Chọn xong là Fonnus bắt đầu nghe máy</span>
            <span className={CHIP_SHORT}>Fonnus bắt đầu nghe máy</span>
          </div>
        </div>
      </div>
    </PlayWhenSeen>
  )
}

const ANSWER_BARS = [0, 1, 2, 3, 4, 5, 6]

/*
 * Both halves of the exchange, not just the assistant's: a single quoted line
 * never showed that the caller is understood. Blush is the assistant's speech,
 * from the right; the caller speaks on paper, from the left.
 */
const TURN = [
  'm-0 max-w-[min(94%,44ch)] px-[13px] py-[11px] text-body-sm leading-[1.55] text-text-body',
  'max-[1024px]:px-[11px] max-[1024px]:py-2.5 max-[561px]:py-[9px] max-[561px]:leading-[1.5]',
  RISE,
].join(' ')
const CALLER_TURN = `${TURN} self-start rounded-[var(--radius-md)_var(--radius-md)_var(--radius-md)_var(--radius-xs)] bg-surface-page`
const LINH_TURN = `${TURN} self-end rounded-[var(--radius-md)_var(--radius-md)_var(--radius-xs)_var(--radius-md)] bg-surface-warm`

/** Step 3 — a real call arriving, answered, and booked. */
export function LiveCallVisual() {
  return (
    <PlayWhenSeen className={SCENE}>
      <div className={PANE}>
        <div className={PANE_HEAD}>
          <Icon name="incoming" size={15} />
          Cuộc gọi đến · 21:14
        </div>

        <div className={PANE_BODY}>
          <div
            className={`flex items-center gap-3 rounded-md bg-surface-page p-[13px] max-[1024px]:px-[11px] max-[1024px]:py-2.5 ${RISE}`}
            style={at(140)}
          >
            <span className="grid size-[38px] flex-none place-items-center rounded-[50%] bg-surface-warm text-text-accent max-[1024px]:size-[34px] motion-safe:in-data-played:animate-[fnPulse_1400ms_var(--ease-in-out)_3]">
              <Icon name="incoming" size={18} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-num text-body-sm leading-(--leading-body) font-semibold tabular-nums">
                0903 ••• 217
              </span>
              <span className="text-ui leading-(--leading-body) text-text-muted">Ngoài giờ làm việc</span>
            </span>
          </div>

          {/* A caption, not a card: the transcript below is what the pane is about. */}
          <div
            className={`flex items-center gap-2.5 px-0.5 text-ui leading-(--leading-body) text-text-muted ${RISE}`}
            style={at(500)}
          >
            <span aria-hidden="true" className="flex h-4 flex-none items-center gap-[3px]">
              {ANSWER_BARS.map((bar) => (
                <span
                  key={bar}
                  className="h-full w-[3px] rounded-pill bg-text-eyebrow [transform:scaleY(0.35)] motion-safe:in-data-played:animate-[fnTalk_900ms_var(--ease-in-out)_infinite]"
                  style={{ animationDelay: `${String(bar * 110)}ms` }}
                />
              ))}
            </span>
            Linh đang trả lời bằng tiếng Việt
          </div>

          <div className="flex flex-col gap-2 max-[1024px]:gap-1.5 max-[561px]:gap-1">
            <p className={CALLER_TURN} style={at(820)}>
              “Alo, mai phòng khám mở cửa mấy giờ em?”
            </p>
            <p className={LINH_TURN} style={at(1120)}>
              “Dạ, mai phòng khám mở cửa 8 giờ. Em giữ lịch 3 giờ chiều thứ Năm nhé?”
            </p>
            <p className={CALLER_TURN} style={at(1440)}>
              “Ừ, em đặt giúp chị.”
            </p>
          </div>

          <div className={CHIP} style={at(1740)}>
            <Icon name="appointment" size={15} />
            <span className={CHIP_LONG}>Đã đặt lịch · 15:00 thứ Năm 10/09</span>
            <span className={CHIP_SHORT}>Đã đặt lịch · 15:00 thứ Năm</span>
          </div>
        </div>
      </div>
    </PlayWhenSeen>
  )
}
