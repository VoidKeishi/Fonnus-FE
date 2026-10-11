/**
 * Copy for the "Nghe thử" call screen on the landing page: the suggestion
 * chips, and the lines and buttons of the states the live call adds — consent
 * before the microphone, the endings, the refused microphone (ADR 0006).
 *
 * A chip is a question the caller asks, handled exactly as a typed line is:
 * handed to the voice session (`api.voice`). The scripted session, which is
 * also the fallback whenever a live one cannot connect, answers every question
 * with the same timed beat (`src/api/voice-scripted.ts`).
 */
export interface SuggestionChip {
  label: string
}

export const CHIPS: SuggestionChip[] = [
  { label: 'Cạo vôi răng bao nhiêu?' },
  { label: '9h sáng thứ Bảy còn trống không?' },
  { label: 'Phòng khám ở đâu?' },
]

/** Live only, before anything connects: what happens to the visitor's voice (ADR 0006 point 8). */
export const CONSENT_LINE =
  'Bạn sắp nói chuyện với Linh — một trợ lý AI. Giọng của bạn được xử lý trực tiếp để Linh trả lời, không lưu lại.'
export const START_LABEL = 'Bắt đầu gọi'

export const ENDED_TIMEOUT_LINE = 'Hết 3 phút gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày.'
export const ENDED_AGENT_LINE = 'Linh đã kết thúc cuộc gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày.'
export const ENDED_ERROR_LINE = 'Mất kết nối với Linh.'
export const CALL_AGAIN_LABEL = 'Gọi lại'
export const TRY_FREE_LABEL = 'Dùng thử miễn phí'

/** Under the state line when the fallback is answering because the microphone was refused. */
export const MIC_DENIED_LINE = 'Trình duyệt chưa cho phép dùng micro, nên bạn đang nghe bản thu sẵn.'
