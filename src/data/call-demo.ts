/**
 * Copy and timings for the "Nghe thử" call screen on the landing page.
 *
 * A chip is a question the caller asks, handled exactly as a typed line is. The
 * demo has no pipeline behind it (`docs/open-questions.md` Q21), so how long the
 * receptionist then talks is the constant below rather than the length of a
 * real reply.
 */
export interface SuggestionChip {
  label: string
}

export const CHIPS: SuggestionChip[] = [
  { label: 'Cạo vôi răng bao nhiêu?' },
  { label: '9h sáng thứ Bảy còn trống không?' },
  { label: 'Phòng khám ở đâu?' },
]

export interface Voice {
  name: string
  desc: string
}

export const VOICES: Voice[] = [
  { name: 'Linh', desc: 'Nữ · miền Nam, ấm áp' },
  { name: 'Mai', desc: 'Nữ · miền Bắc, nhẹ nhàng' },
  { name: 'An', desc: 'Nữ · trẻ trung, rõ ràng' },
  { name: 'Minh', desc: 'Nam · trầm, điềm tĩnh' },
  { name: 'Quân', desc: 'Nam · miền Nam, thân thiện' },
]

/** How long a typed question makes the receptionist speak. */
export const TYPED_SPEAK_MS = 4400
/** How long a voice preview plays. */
export const VOICE_PREVIEW_MS = 2600
