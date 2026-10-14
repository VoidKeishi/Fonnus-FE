/**
 * Copy for the "Nghe thử" call screen on the landing page: the suggestion
 * chips, and the lines and buttons of the states around the conversation —
 * consent before the microphone, the endings, a call that could not connect,
 * and the typed conversation a browser without a microphone gets (ADR 0006,
 * ADR 0007).
 *
 * A chip is a question the caller asks, handled exactly as a typed line is:
 * handed to the voice session (`api.voice`), which is always the ElevenLabs
 * agent. Nothing here is answered by a script.
 */
export interface SuggestionChip {
  label: string
}

export const CHIPS: SuggestionChip[] = [
  { label: 'Cạo vôi răng bao nhiêu?' },
  { label: '9h sáng thứ Bảy còn trống không?' },
  { label: 'Phòng khám ở đâu?' },
]

/**
 * Before anything connects: what happens to what the visitor says or types
 * (ADR 0006 point 8). Shown before the browser has answered about the
 * microphone, so it covers both inputs (ADR 0007 point 7).
 */
export const CONSENT_LINE =
  'Bạn sắp nói chuyện với Linh — một trợ lý AI. Giọng nói hoặc tin nhắn của bạn được xử lý trực tiếp để Linh trả lời, không lưu lại.'
export const START_LABEL = 'Bắt đầu gọi'

export const ENDED_TIMEOUT_LINE = 'Hết 3 phút gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày.'
export const ENDED_AGENT_LINE = 'Linh đã kết thúc cuộc gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày.'
export const ENDED_ERROR_LINE = 'Mất kết nối với Linh.'
export const CALL_AGAIN_LABEL = 'Gọi lại'
export const WAITLIST_LABEL = 'Vào danh sách chờ'

/** Nothing could connect: the token route refused, the SDK failed, or the time ran out (ADR 0007 point 5). */
export const CONNECT_FAILED_LINE = 'Không kết nối được với Linh lúc này. Bạn thử gọi lại sau một lát.'

/** Under the state line of a typed conversation: why this is not a call. */
export const TEXT_MODE_LINE = 'Không dùng được micro trên thiết bị này, nên bạn nhắn và Linh trả lời bằng chữ.'
export const TEXT_PLACEHOLDER = 'Nhắn cho Linh…'
export const TEXT_FOOTNOTE = 'Linh trả lời bằng chữ trong chế độ này. Bấm ✕ để thoát.'

/** Who said a line of the typed conversation. */
export const SPEAKER_LABELS = { agent: 'Linh', visitor: 'Bạn' } as const
