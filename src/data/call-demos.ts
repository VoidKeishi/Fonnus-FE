/*
 * Scripted sample calls for the "Khả năng" section. Each one replays as a
 * transcript that rolls turn by turn and ends in the action Fonnus took.
 *
 * These are SAMPLE calls for a fictional clinic — the prices and the doctor's
 * line are illustrative, not a real price list. Replace them with a real
 * (consented, anonymised) call before launch.
 *
 * No recording yet, so the player rolls the transcript in silence; an audio
 * field and its player arrive with the first recording.
 */
export interface CallTurn {
  role: 'caller' | 'linh'
  text: string
  /** Seconds into the call when this turn appears. */
  at: number
}

export interface CallDemo {
  id: string
  /** Shown on the widget, and read out to screen readers. */
  title: string
  caller: string
  /** Total length in seconds. */
  duration: number
  /** When the action visual appears. */
  actionAt: number
  turns: CallTurn[]
}

export const BOOKING_DEMO: CallDemo = {
  id: 'dat-lich',
  title: 'Cuộc gọi mẫu · đặt lịch hẹn',
  caller: '0903 ••• 217',
  duration: 9,
  actionAt: 7.4,
  turns: [
    { role: 'caller', text: 'Cho chị đặt lịch khám vào 3 giờ chiều thứ Năm tuần sau.', at: 0.5 },
    {
      role: 'linh',
      text: 'Dạ, em đã đặt lịch cho mình vào 3 giờ chiều thứ Năm ngày 10/09 ạ.',
      at: 4,
    },
  ],
}

export const FAQ_DEMO: CallDemo = {
  id: 'hoi-dap',
  title: 'Cuộc gọi mẫu · hỏi giá dịch vụ',
  caller: '0912 ••• 480',
  duration: 9.4,
  actionAt: 7.6,
  turns: [
    { role: 'caller', text: 'Cho hỏi cạo vôi răng bên mình bao nhiêu tiền?', at: 0.5 },
    {
      role: 'linh',
      text: 'Dạ, cạo vôi răng bên em 300.000 đồng một lần, làm khoảng 30 phút ạ.',
      at: 3.8,
    },
  ],
}

export const HANDOFF_DEMO: CallDemo = {
  id: 'chuyen-may',
  title: 'Cuộc gọi mẫu · chuyển cho nhân viên',
  caller: '0987 ••• 105',
  duration: 10.4,
  actionAt: 8.4,
  turns: [
    { role: 'caller', text: 'Em bị sưng đau mấy hôm nay, cho em hỏi bác sĩ được không ạ?', at: 0.5 },
    {
      role: 'linh',
      text: 'Dạ, trường hợp này em nối máy cho bác sĩ trực ngay. Mình giữ máy giúp em ạ.',
      at: 4.2,
    },
  ],
}
