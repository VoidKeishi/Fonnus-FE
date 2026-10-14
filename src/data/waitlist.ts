/**
 * Copy for the night panel beside the waitlist form. Strings only, no markup.
 *
 * The shift is illustrative, not live data: four calls Linh answered while the
 * clinic was closed, the same on every load. The fifth row, `mine`, appears
 * once a visitor has joined, and names them.
 */

interface NightCall {
  time: string
  what: string
  /** The caller, under the request: new or returning. */
  who: string
  outcome: string
}

export const WAITLIST_PANEL: {
  logLabel: string
  calls: readonly NightCall[]
  /** `what` is followed by the name the visitor just left. */
  mine: { time: string; what: string; note: string; outcome: string }
  /** `accent` is set in the night terracotta after `lead`. */
  headline: { lead: string; accent: string }
} = {
  logLabel: 'Một ca đêm của Linh',
  calls: [
    { time: '21:47', what: 'Hỏi giá tẩy trắng răng', who: 'Khách mới', outcome: 'Đã báo giá' },
    { time: '23:12', what: 'Đặt lịch khám cho con', who: 'Khách quen', outcome: 'Đã đặt lịch' },
    { time: '02:05', what: 'Đau răng, hỏi giờ mở cửa', who: 'Khách mới', outcome: 'Hẹn sáng mai' },
    { time: '06:30', what: 'Đổi lịch hẹn thứ Sáu', who: 'Khách quen', outcome: 'Đã đổi lịch' },
  ],
  mine: { time: 'Sắp tới', what: 'Fonnus gọi', note: 'Khi đến lượt phòng khám của bạn', outcome: 'Đã giữ chỗ' },
  headline: { lead: 'Khi phòng khám đã tắt đèn,', accent: 'Linh vẫn nghe máy.' },
}
