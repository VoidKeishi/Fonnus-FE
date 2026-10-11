/**
 * Copy for the "Nghe thử" call screen on the landing page.
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
