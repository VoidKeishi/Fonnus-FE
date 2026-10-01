/*
 * Scripted sample calls for the "Khả năng" section. Each one replays its
 * recording while the transcript rolls in turn by turn, and ends in the action
 * Fonnus took. The `at` and `actionAt` seconds are moments in the recording.
 *
 * These are SAMPLE calls for a fictional clinic — the prices and the doctor's
 * line are illustrative, not a real price list, and the voices are synthetic.
 * Replace them with a real (consented, anonymised) call before launch.
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
  /** The call's recording, a static file downloaded only once the visitor presses play. */
  audioSrc: string
  /** Total length in seconds: the recording's own length. */
  duration: number
  /** When the action visual appears. */
  actionAt: number
  turns: CallTurn[]
}

export const BOOKING_DEMO: CallDemo = {
  id: 'dat-lich',
  title: 'Cuộc gọi mẫu · đặt lịch hẹn',
  caller: '0903 ••• 217',
  audioSrc: '/audio/fonnus-landing-page-auto-scheduling.mp3',
  duration: 10.19,
  actionAt: 7.5,
  turns: [
    { role: 'caller', text: 'Cho chị đặt lịch khám vào 3 giờ chiều thứ Năm tuần sau.', at: 0.5 },
    {
      role: 'linh',
      text: 'Dạ, em đã đặt lịch cho mình vào 3 giờ chiều thứ Năm ngày 10/09 ạ. Hẹn gặp chị tại phòng khám ạ.',
      at: 3.6,
    },
  ],
}

export const FAQ_DEMO: CallDemo = {
  id: 'hoi-dap',
  title: 'Cuộc gọi mẫu · hỏi giá dịch vụ',
  caller: '0912 ••• 480',
  audioSrc: '/audio/fonnus-landing-page-general-faq.mp3',
  duration: 10.27,
  actionAt: 8.4,
  turns: [
    { role: 'caller', text: 'Cho hỏi cạo vôi răng bên mình bao nhiêu tiền?', at: 0.5 },
    {
      role: 'linh',
      text: 'Dạ, cạo vôi răng bên em 300.000 đồng một lần, làm khoảng 30 phút ạ. Anh có muốn đặt lịch kiểm tra miễn phí không ạ?',
      at: 3.6,
    },
  ],
}

export const HANDOFF_DEMO: CallDemo = {
  id: 'chuyen-may',
  title: 'Cuộc gọi mẫu · chuyển cho nhân viên',
  caller: '0987 ••• 105',
  audioSrc: '/audio/fonnus-landing-page-human-handoff.mp3',
  duration: 9.33,
  actionAt: 8.4,
  turns: [
    { role: 'caller', text: 'Em bị sưng đau mấy hôm nay, cho em hỏi bác sĩ được không ạ?', at: 0.5 },
    {
      role: 'linh',
      text: 'Dạ, trường hợp này em nối máy cho bác sĩ trực ngay. Mình giữ máy giúp em ạ.',
      at: 4.5,
    },
  ],
}
