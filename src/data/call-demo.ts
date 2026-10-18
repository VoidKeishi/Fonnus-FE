/**
 * Copy for the "Nghe thử" call screen on the landing page: the suggestion
 * chips, and the lines and buttons of the states around the conversation —
 * consent before the microphone, the hour's budget and its countdown, the
 * endings, a call that could not connect, and the typed conversation a browser
 * without a microphone gets (ADR 0006, ADR 0007, ADR 0008, ADR 0010).
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

/*
 * The hour's budget (ADR 0008). Each sentence takes its number already said:
 * `remaining` is "2 phút 10 giây", `wait` is "42 phút".
 */
/** Under the consent line, when part of the hour is already spent. */
export const budgetLeftLine = (remaining: string) => `Giờ này bạn còn ${remaining} gọi thử.`
/** Instead of the consent line, when nothing of the hour is left. */
export const budgetSpentLine = (wait: string) =>
  `Bạn đã dùng hết 3 phút gọi thử trong giờ này — gọi lại được sau ${wait}. Ở phòng khám của bạn, Linh nghe máy cả ngày.`

/**
 * Under the call screen's title while a session runs (ADR 0010): what is left
 * of the hour's three minutes, already said as "2:39", over all three.
 */
export const countdownLine = (left: string) => `${left} / 3:00`
export const COUNTDOWN_LABEL = 'Thời gian gọi thử còn lại'
/** Said once to a screen reader, as the countdown crosses `COUNTDOWN_WARNING_MS`. */
export const COUNTDOWN_WARNING_LINE = 'Còn 30 giây gọi thử.'
export const COUNTDOWN_WARNING_MS = 30_000

/** The call that spent the hour ended on its cap. */
export const endedTimeoutLine = (wait: string) =>
  `Hết 3 phút gọi thử trong giờ này — gọi lại được sau ${wait}. Ở phòng khám của bạn, Linh nghe máy cả ngày.`
/**
 * A call ended on its cap while the hour turned under it, so a new hour's
 * budget is already there: the only ending on the cap that still offers "Gọi lại".
 */
export const ENDED_TIMEOUT_LINE = 'Hết 3 phút gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày.'
export const ENDED_AGENT_LINE = 'Linh đã kết thúc cuộc gọi thử. Ở phòng khám của bạn, Linh nghe máy cả ngày.'
export const ENDED_ERROR_LINE = 'Mất kết nối với Linh.'
/** After the agent's or the error's line, when the call spent the rest of the hour. */
export const callAgainAfterLine = (wait: string) => `Gọi lại được sau ${wait}.`
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
