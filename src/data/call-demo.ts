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
  /** The set shown once this chip is sent. A fourth-level chip has none and leads back to the first set. */
  next?: readonly SuggestionChip[]
}

/*
 * The product owner's tree of suggestions, four levels deep and at most three
 * to a set, copied word for word: each set follows naturally from the chip
 * that led to it. Some questions reach past what Linh knows on purpose.
 */
export const CHIP_TREE: readonly SuggestionChip[] = [
  {
    label: 'Bên mình có những dịch vụ gì?',
    next: [
      {
        label: 'Niềng răng giá bao nhiêu ạ?',
        next: [
          {
            label: 'Niềng trong suốt thì sao ạ?',
            next: [
              { label: 'Có trả góp không ạ?' },
              { label: 'Có cam kết răng đẹp không?' },
              { label: 'Đặt lịch tư vấn niềng giúp em' },
            ],
          },
          {
            label: 'Bác sĩ niềng làm ngày nào?',
            next: [
              { label: 'Em muốn khám đúng bác sĩ Hà' },
              { label: 'Thứ Năm này còn lịch không?' },
              { label: 'Khám tư vấn có mất phí không?' },
            ],
          },
          {
            label: 'Có trả góp không ạ?',
            next: [
              { label: 'Có xuất hóa đơn đỏ không ạ?' },
              { label: 'Trả tiền mặt được không ạ?' },
              { label: 'Vậy đặt lịch tư vấn giúp em' },
            ],
          },
        ],
      },
      {
        label: 'Trồng implant hết bao nhiêu?',
        next: [
          {
            label: 'Mất 2 răng thì khoảng bao nhiêu?',
            next: [
              { label: 'Implant có bảo hành không ạ?' },
              { label: 'Bác sĩ implant làm ngày nào?' },
              { label: 'Đặt lịch khám giúp em' },
            ],
          },
          {
            label: 'Có làm All-on-4 không ạ?',
            next: [
              { label: 'Vậy bọc sứ giá bao nhiêu?' },
              { label: 'Chụp phim X-quang bao nhiêu?' },
              { label: 'Em đặt lịch khám trước nhé' },
            ],
          },
          {
            label: 'Chụp phim có tốn phí không?',
            next: [
              { label: 'Có nhận bảo hiểm y tế không?' },
              { label: 'Trả góp được không ạ?' },
              { label: 'Đặt lịch khám giúp em' },
            ],
          },
        ],
      },
      {
        label: 'Tiêm filler cằm giá sao ạ?',
        next: [
          {
            label: 'Một lần tiêm cần mấy ml ạ?',
            next: [
              { label: 'Bác sĩ thẩm mỹ là ai ạ?' },
              { label: 'Đang có khuyến mãi gì không?' },
              { label: 'Đặt lịch tư vấn giúp em' },
            ],
          },
          {
            label: 'Bên mình có nâng mũi không?',
            next: [
              { label: 'Vậy filler má giá sao ạ?' },
              { label: 'Có xuất hóa đơn VAT không?' },
              { label: 'Đặt lịch tư vấn giúp em' },
            ],
          },
          {
            label: 'Tiêm xong bị bầm có sao không?',
            next: [
              { label: 'Số trực phòng khám là gì ạ?' },
              { label: 'Mấy giờ phòng khám mở cửa?' },
              { label: 'Cho em gặp nhân viên ạ' },
            ],
          },
        ],
      },
    ],
  },
  {
    label: 'Phòng khám ở đâu ạ?',
    next: [
      {
        label: 'Có chỗ gửi ô tô không ạ?',
        next: [
          {
            label: 'Xe máy gửi ở đâu ạ?',
            next: [
              { label: 'Mấy giờ phòng khám mở cửa?' },
              { label: 'Chủ nhật có làm không ạ?' },
              { label: 'Đặt lịch sáng thứ Bảy giúp em' },
            ],
          },
          {
            label: 'Mấy giờ phòng khám mở cửa?',
            next: [
              { label: 'Buổi trưa có nghỉ không ạ?' },
              { label: 'Chiều Chủ nhật có làm không?' },
              { label: 'Đặt lịch 6h tối mai giúp em' },
            ],
          },
          {
            label: 'Có nhận bảo hiểm y tế không?',
            next: [
              { label: 'Thanh toán bằng thẻ được không?' },
              { label: 'Có xuất hóa đơn đỏ không ạ?' },
              { label: 'Khám tư vấn có mất phí không?' },
            ],
          },
        ],
      },
      {
        label: 'Chủ nhật có làm việc không ạ?',
        next: [
          {
            label: 'Tết bên mình nghỉ đến bao giờ?',
            next: [
              { label: 'Lễ 30/4 có làm không ạ?' },
              { label: 'Buổi trưa có nghỉ không ạ?' },
              { label: 'Đặt lịch sáng Chủ nhật giúp em' },
            ],
          },
          {
            label: 'Buổi trưa có nghỉ không ạ?',
            next: [
              { label: 'Tối mấy giờ đóng cửa ạ?' },
              { label: 'Đến khám có phải chờ lâu không?' },
              { label: 'Đặt lịch 5h chiều mai giúp em' },
            ],
          },
          {
            label: 'Cho em gặp nhân viên được không?',
            next: [
              { label: 'Vậy cạo vôi răng giá bao nhiêu?' },
              { label: 'Phòng khám có mấy bác sĩ ạ?' },
              { label: 'Đặt lịch khám giúp em luôn' },
            ],
          },
        ],
      },
      {
        label: 'Bên mình có mấy cơ sở ạ?',
        next: [
          {
            label: 'Gần ngã tư nào vậy ạ?',
            next: [
              { label: 'Có chỗ gửi ô tô không ạ?' },
              { label: 'Chủ nhật có làm không ạ?' },
              { label: 'Đặt lịch sáng thứ Bảy giúp em' },
            ],
          },
          {
            label: 'Phòng khám có mấy bác sĩ ạ?',
            next: [
              { label: 'Bác sĩ Hùng làm ngày nào ạ?' },
              { label: 'Em muốn khám với bác sĩ Hùng' },
              { label: 'Khám tư vấn có mất phí không?' },
            ],
          },
          {
            label: 'Có nhận bảo hiểm y tế không?',
            next: [
              { label: 'Có trả góp không ạ?' },
              { label: 'Có xuất hóa đơn đỏ không ạ?' },
              { label: 'Đặt lịch khám giúp em' },
            ],
          },
        ],
      },
    ],
  },
  {
    label: 'Thứ Bảy này còn lịch trống không?',
    next: [
      {
        label: '9h sáng được không ạ?',
        next: [
          {
            label: 'Em tên Lan, số 0912 345 678',
            next: [
              { label: 'Em cần mang theo gì không ạ?' },
              { label: 'Gửi xe máy ở đâu ạ?' },
              { label: 'Khám có mất phí không ạ?' },
            ],
          },
          {
            label: 'Khám tư vấn có mất phí không?',
            next: [
              { label: 'Chụp phim bao nhiêu tiền ạ?' },
              { label: 'Em tên Lan, số 0912 345 678' },
              { label: 'Thanh toán thẻ được không ạ?' },
            ],
          },
          {
            label: 'Em muốn tư vấn niềng răng',
            next: [
              { label: 'Bác sĩ niềng có làm thứ Bảy?' },
              { label: 'Niềng răng giá bao nhiêu ạ?' },
              { label: 'Em tên Lan, số 0912 345 678' },
            ],
          },
        ],
      },
      {
        label: 'Chiều Chủ nhật được không ạ?',
        next: [
          {
            label: 'Vậy sáng Chủ nhật nhé',
            next: [
              { label: '10h sáng được không ạ?' },
              { label: 'Em tên Minh, số 0987 654 321' },
              { label: 'Phòng khám ở đâu ạ?' },
            ],
          },
          {
            label: 'Tối thứ Hai lúc 7h được không?',
            next: [
              { label: 'Em tên Minh, số 0987 654 321' },
              { label: 'Có chỗ gửi xe máy không ạ?' },
              { label: 'Cạo vôi răng giá bao nhiêu ạ?' },
            ],
          },
          {
            label: '12h30 trưa được không ạ?',
            next: [
              { label: 'Vậy 2h chiều thì sao ạ?' },
              { label: 'Em tên Minh, số 0987 654 321' },
              { label: 'Tối mấy giờ đóng cửa ạ?' },
            ],
          },
        ],
      },
      {
        label: 'Em đau răng, hôm nay khám được không?',
        next: [
          {
            label: 'Có nên uống thuốc giảm đau không?',
            next: [
              { label: 'Em bị sưng má và sốt nữa' },
              { label: 'Vậy cho em lịch sớm nhất' },
              { label: 'Phòng khám ở đâu ạ?' },
            ],
          },
          {
            label: 'Cho em lịch sớm nhất ạ',
            next: [
              { label: 'Em tên Hoa, số 0903 111 222' },
              { label: 'Khám có mất phí không ạ?' },
              { label: 'Gửi xe máy ở đâu ạ?' },
            ],
          },
          {
            label: 'Nhổ răng khôn giá bao nhiêu?',
            next: [
              { label: 'Nhổ răng khôn có đau không?' },
              { label: 'Trả góp được không ạ?' },
              { label: 'Cho em lịch sớm nhất nhé' },
            ],
          },
        ],
      },
    ],
  },
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
