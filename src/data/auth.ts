/**
 * Copy for the sign-in and sign-up screens. Strings only, no markup — a screen
 * is then one place to read the layout and this is one place to read the words.
 *
 * The scene in `SIGNIN_PANEL` is illustrative, not live data: it is the same
 * fixture on every load, and it is the only place on an auth screen where the
 * product is visible at all.
 */
import type { IconName } from '@/design-system'

/**
 * Under every form, on every step. Two things a clinic owner in Vietnam checks
 * before typing their number into a service they have just met: where the data
 * lives, and whether a human answers when it goes wrong.
 */
export const AUTH_FOOTNOTE = {
  residency: 'Dữ liệu phòng khám lưu tại Việt Nam',
  supportLabel: 'Cần hỗ trợ?',
  supportNote: '8:00–20:00',
} as const

export const CONTACT = {
  phone: '024 7307 7199',
  phoneHref: 'tel:+842473077199',
} as const

interface WhenChip {
  icon: IconName
  time: string
  context: readonly string[]
}

interface CallRow {
  number: string
  meta: string
  outcome: string
  /** Booked outcomes are tinted; everything else stays neutral. */
  booked: boolean
}

interface Tile {
  icon: IconName
  num: string
  label: string
}

/**
 * The sign-in panel: the morning after. Someone signing in has already bought
 * the promise, so the panel shows what they are signing in *to* rather than
 * selling it again.
 */
export const SIGNIN_PANEL: {
  when: WhenChip
  logLabel: string
  logCount: { num: string; label: string }
  calls: readonly CallRow[]
  tiles: readonly Tile[]
  headline: string
  lede: string
} = {
  when: { icon: 'hours', time: '7:30', context: ['Sáng thứ Bảy', 'Trước giờ mở cửa'] },
  logLabel: 'Đêm qua',
  logCount: { num: '6', label: 'cuộc gọi đã nghe' },
  calls: [
    { number: '0903 ••• 217', meta: '21:14 · hỏi giá cạo vôi răng', outcome: 'Đã đặt lịch', booked: true },
    { number: '0938 ••• 044', meta: '22:02 · hỏi giờ mở cửa', outcome: 'Đã trả lời', booked: false },
    { number: '0911 ••• 882', meta: '06:48 · đặt lịch niềng răng', outcome: 'Đã đặt lịch', booked: true },
  ],
  tiles: [
    { icon: 'appointment', num: '3', label: 'lịch hẹn mới hôm nay' },
    { icon: 'answered', num: '1', label: 'lời nhắn cần gọi lại' },
  ],
  headline: 'Chào mừng bạn quay lại.',
  lede: 'Cuộc gọi đêm qua, lịch hẹn và báo cáo hôm nay của phòng khám đang chờ bạn.',
}
