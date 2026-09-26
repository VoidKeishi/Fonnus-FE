import type { IconName } from '@/design-system'

/*
 * The figures and lists the "Chấm điểm hotline" page draws.
 *
 * The call figures are the reference study's, verbatim, and the page credits
 * them to it: a survey that rang more than 10,000 dental practices in North
 * America. They are not Fonnus's own calls and not Vietnamese clinics, so the
 * source line must never be reworded to suggest either. When Fonnus has its own
 * Vietnamese benchmark, replace the figures and `STUDY` together.
 */

export const STUDY = { practices: '10.000', region: 'Bắc Mỹ' }

export interface HourShare {
  /** 24-hour clock, the way the rest of the product writes a time. */
  time: string
  /** Share of calls nobody picked up, 0–100. The rest were answered. */
  missed: number
}

export const MISSED_BY_HOUR: HourShare[] = [
  { time: '7:00', missed: 77 },
  { time: '11:00', missed: 34 },
  { time: '12:30', missed: 36 },
  { time: '15:00', missed: 39 },
  { time: '17:00', missed: 63 },
  { time: '20:00', missed: 82 },
]

/** The columns that are the working day, for the bracket under the chart — indices, inclusive. */
export const WORKING_HOURS = { from: 1, to: 3 }

/** Across the whole day. */
export const MISSED_OVERALL = 33

export interface CallReason {
  icon: IconName
  label: string
}

/** Why patients ring: more than booking, which is why a missed call costs more than a booking. */
export const CALL_REASONS: CallReason[] = [
  { icon: 'appointment', label: 'Đặt lịch' },
  { icon: 'calendar', label: 'Đổi lịch' },
  { icon: 'done', label: 'Xác nhận lịch' },
  { icon: 'help', label: 'Hỏi đáp' },
  { icon: 'practitioner', label: 'Tái khám' },
]

export interface ReportMetric {
  key: string
  icon: IconName
  label: string
  /** A score out of 100, higher is better. */
  you: number
  average: number
}

/**
 * The sample report's rows — the four things every test call is scored on.
 * Sample values: the card is labelled "Báo cáo mẫu" and says whose it is not.
 * Every row is a score where higher is better, so the bars can be compared; a
 * missed-call *rate* would run the other way and read as a good result.
 */
export const SAMPLE_REPORT: ReportMetric[] = [
  { key: 'speed', icon: 'hours', label: 'Tốc độ nghe máy', you: 58, average: 71 },
  { key: 'answered', icon: 'answered', label: 'Tỉ lệ nghe máy', you: 67, average: 74 },
  { key: 'questions', icon: 'help', label: 'Trả lời câu hỏi thường gặp', you: 82, average: 69 },
  { key: 'experience', icon: 'caller', label: 'Trải nghiệm người gọi', you: 74, average: 72 },
]
