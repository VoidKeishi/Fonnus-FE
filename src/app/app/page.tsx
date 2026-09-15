import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Tổng quan' }

export default function Page() {
  return <Placeholder title="Tổng quan">Cuộc gọi hôm nay, lịch hẹn mới và những việc cần bạn xem lại sẽ hiện ở đây.</Placeholder>
}
