import { BOOKING_DEMO, FAQ_DEMO, HANDOFF_DEMO } from '@/data/call-demos'
import { BookingAction, PriceAction, TransferAction } from './capability-actions'
import { CapabilityRow } from './capability-row'
import { CallLogVisual } from './capability-visuals'
import { CallDemoPlayer, OneCallAtATime } from './call-demo-player'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, SECTION_INNER } from './section-chrome'

/*
 * Spacing lives on the divider rather than in a gap, so the dashed rule sits
 * exactly halfway between two capabilities.
 */
const ROWS = [
  'flex flex-col',
  '[&>*+*]:mt-[clamp(40px,7vh,80px)] [&>*+*]:border-t-[1.5px] [&>*+*]:border-dashed [&>*+*]:border-border-dashed [&>*+*]:pt-[clamp(40px,7vh,80px)]',
].join(' ')

/**
 * "Khả năng": four capabilities, three of them with a sample call to replay
 * and the fourth with the call log the owner reads next morning. A server
 * component; the players are its only client state.
 */
export function Capabilities() {
  return (
    <section id="kha-nang" className={SECTION_BAND}>
      <div className={SECTION_INNER}>
        <div data-reveal="0" className={SECTION_EYEBROW}>
          Khả năng
        </div>
        <h2 data-reveal="1" className={`${SECTION_HEADING} mb-4 max-w-[22ch]`}>
          Một lễ tân không nghỉ, không quên
        </h2>
        <p data-reveal="2" className="m-0 mb-16 max-w-[56ch] text-body-lg text-text-muted">
          Ba cuộc gọi mẫu, phát lại ngay tại đây — bấm nghe và xem Fonnus làm gì sau mỗi câu.
        </p>

        <OneCallAtATime>
          <div className={ROWS}>
            <CapabilityRow
              eyebrow="Đặt lịch tự động"
              title="Hiểu “3 giờ chiều thứ Năm tuần sau”"
              body="Fonnus hiểu ngày giờ nói theo kiểu tiếng Việt, đối chiếu lịch trống và xác nhận ngay trong cuộc gọi."
              wideBody
              points={['Kiểm tra lịch trống theo thời gian thực', 'Xác nhận bằng giọng nói, không cần gọi lại']}
              visual={<CallDemoPlayer demo={BOOKING_DEMO} action={<BookingAction />} />}
            />

            <CapabilityRow
              reversed
              eyebrow="Trả lời câu hỏi chung"
              title="Giá, giờ, địa chỉ — trả lời thẳng"
              body="Câu trả lời lấy từ bảng giá và thông tin bạn khai, không phải Fonnus tự nghĩ ra. Không biết thì nói không biết, rồi ghi lại để bạn trả lời."
              points={['Dùng đúng bảng giá của phòng khám', 'Không tự suy diễn khi thiếu dữ liệu']}
              visual={<CallDemoPlayer demo={FAQ_DEMO} action={<PriceAction />} />}
            />

            <CapabilityRow
              eyebrow="Chuyển cho nhân viên khi cần"
              title="Luôn có người thật cách một bước"
              body="Câu hỏi thuộc chuyên môn y khoa, ca gấp, hoặc khách muốn gặp người thật: Fonnus nối máy sang nhân viên, hoặc ghi lời nhắn để gọi lại."
              points={['Nối máy trực tiếp cho nhân viên', 'Ghi lời nhắn kèm số để gọi lại']}
              visual={<CallDemoPlayer demo={HANDOFF_DEMO} action={<TransferAction />} />}
            />

            <CapabilityRow
              reversed
              eyebrow="Nhật ký cuộc gọi đầy đủ"
              title="Mọi cuộc gọi đều được ghi lại"
              body="Xem lại bản ghi âm, nội dung và kết quả từng cuộc gọi trên bảng điều khiển — kèm tóm tắt qua Zalo mỗi tối."
              points={['Bản ghi âm và nội dung đầy đủ', 'Tóm tắt mỗi ngày qua Zalo']}
              visual={<CallLogVisual />}
            />
          </div>
        </OneCallAtATime>
      </div>
    </section>
  )
}
