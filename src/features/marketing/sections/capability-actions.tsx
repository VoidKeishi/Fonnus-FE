import { Icon } from '@/design-system'

/*
 * What Fonnus DID, drawn rather than described. Each one is the last thing to
 * appear in its call demo, so it has to read on its own in about a second.
 * Server components, handed to the player as its `action`.
 *
 * The one marked slot, price row or avatar sits on blush: these are drawings of
 * the product, not controls in a form (docs/ui-ux-principles.md §1).
 */

const CARD = 'rounded-md bg-surface-page p-4 shadow-[inset_0_0_0_1px_var(--border-hairline)]'

const CARD_HEAD =
  'mb-3.5 flex items-center gap-2 text-eyebrow leading-(--leading-body) font-semibold tracking-[0.06em] text-text-accent uppercase'

const NOTE = 'm-0 mt-3 text-ui leading-[1.5] text-text-muted'

/** The single filled thing in a card: the booked slot, the price read out. */
const MARKED = 'bg-surface-warm font-medium text-text-body shadow-[inset_0_0_0_1.5px_var(--text-eyebrow)]'

const DAYS = [
  { d: 'T2', n: '07' },
  { d: 'T3', n: '08' },
  { d: 'T4', n: '09' },
  { d: 'T5', n: '10' },
  { d: 'T6', n: '11' },
  { d: 'T7', n: '12' },
  { d: 'CN', n: '13' },
]

const SLOT = 'flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-body-sm leading-(--leading-body)'
const SLOT_FREE = `${SLOT} text-text-muted shadow-[inset_0_0_0_1px_var(--border-hairline)]`
const SLOT_TIME = 'flex-none font-num font-semibold tabular-nums'

/** The appointment lands in the calendar: Thursday 10/09, 15:00. */
export function BookingAction() {
  return (
    <div className={CARD}>
      <div className={CARD_HEAD}>
        <Icon name="appointment" size={17} />
        Lịch hẹn đã vào sổ
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <span
            key={day.d}
            className={[
              'flex flex-col items-center gap-0.5 rounded-sm px-0.5 py-2',
              day.d === 'T5'
                ? 'bg-action-primary text-text-on-accent shadow-[0_6px_16px_color-mix(in_srgb,var(--action-primary)_26%,transparent)]'
                : 'text-text-muted',
            ].join(' ')}
          >
            <span className="text-[11px] leading-(--leading-body) font-semibold tracking-[0.04em]">{day.d}</span>
            <span className="font-num text-body-sm leading-(--leading-body) font-semibold tabular-nums">{day.n}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={SLOT_FREE}>
          <span className={SLOT_TIME}>14:00</span> Trống
        </span>
        <span className={`${SLOT} ${MARKED}`}>
          <span className={SLOT_TIME}>15:00</span> 0903 ••• 217 · khám tổng quát
          <Icon name="appointment" size={15} className="ml-auto" color="var(--text-accent)" />
        </span>
        <span className={SLOT_FREE}>
          <span className={SLOT_TIME}>16:00</span> Trống
        </span>
      </div>
    </div>
  )
}

const PRICES = [
  { name: 'Khám tổng quát', price: '150.000 đ' },
  { name: 'Cạo vôi răng', price: '300.000 đ' },
  { name: 'Trám răng', price: 'từ 400.000 đ' },
]

/** The answer came out of the clinic's own price list — shown, not claimed. */
export function PriceAction() {
  return (
    <div className={CARD}>
      <div className={CARD_HEAD}>
        <Icon name="list" size={17} />
        Lấy từ bảng giá của phòng khám
      </div>

      <div className="flex flex-col gap-1">
        {PRICES.map((row) => {
          const quoted = row.name === 'Cạo vôi răng'
          return (
            <span
              key={row.name}
              className={`flex items-center justify-between gap-3 rounded-sm px-3 py-[11px] text-body-sm leading-(--leading-body) ${quoted ? MARKED : 'text-text-muted'}`}
            >
              <span>{row.name}</span>
              <span className={`flex-none font-num font-semibold tabular-nums ${quoted ? 'text-text-accent' : ''}`}>
                {row.price}
              </span>
            </span>
          )
        })}
      </div>

      <p className={NOTE}>Fonnus chỉ đọc lại con số bạn đã khai, không tự nghĩ ra.</p>
    </div>
  )
}

const PARTY =
  'flex min-w-0 flex-[1_1_0] items-center gap-2.5 rounded-sm bg-surface-card px-3 py-[11px] shadow-[inset_0_0_0_1px_var(--border-hairline)]'
const AVATAR =
  'grid size-[34px] flex-none place-items-center rounded-[50%] font-display text-body-sm leading-(--leading-body) font-semibold'

/** The call goes to a human, and the screen says who and when. */
export function TransferAction() {
  return (
    <div className={CARD}>
      <div className={CARD_HEAD}>
        <Icon name="answered" size={17} />
        Đã nối máy cho người thật
      </div>

      {/* Side by side, or stacked with the arrow turned down on a narrow phone. */}
      <div className="flex items-center gap-3 max-[461px]:flex-col max-[461px]:items-stretch max-[461px]:gap-2">
        <span className={PARTY}>
          <span className={`${AVATAR} bg-action-primary text-text-on-accent`}>L</span>
          <PartyName name="Linh" role="Lễ tân Fonnus" />
        </span>

        <span aria-hidden="true" className="grid flex-none place-items-center text-text-eyebrow max-[461px]:rotate-90">
          <Icon name="arrow-right" size={18} />
        </span>

        <span className={PARTY}>
          <span className={`${AVATAR} bg-surface-warm text-text-accent`}>
            <Icon name="caller" size={18} />
          </span>
          <PartyName name="BS. Trần Minh" role="Bác sĩ trực" />
        </span>
      </div>

      <p className={NOTE}>Nối máy sau 4 giây. Nếu không ai bắt máy, Fonnus ghi lời nhắn kèm số.</p>
    </div>
  )
}

function PartyName({ name, role }: { name: string; role: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-px">
      <span className="truncate text-body-sm leading-(--leading-body) font-semibold text-text-body">{name}</span>
      <span className="text-ui leading-(--leading-body) whitespace-nowrap text-text-muted">{role}</span>
    </span>
  )
}
