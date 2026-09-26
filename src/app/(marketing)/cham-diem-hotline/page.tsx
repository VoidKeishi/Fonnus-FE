import type { Metadata } from 'next'
import { HotlineReportPage } from '@/features/marketing/hotline/hotline-report-page'

export const metadata: Metadata = {
  title: 'Chấm điểm hotline miễn phí',
  description:
    'Phòng khám nào cũng bỏ lỡ nhiều cuộc gọi hơn mình nghĩ. Để Fonnus gọi thử hotline từng cơ sở của bạn 5–7 lần, như một bệnh nhân thật, rồi nhận báo cáo chấm điểm miễn phí qua email.',
}

export default function Page() {
  return <HotlineReportPage />
}
