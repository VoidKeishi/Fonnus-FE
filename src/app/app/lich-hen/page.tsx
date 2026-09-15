import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Lịch hẹn' }

export default function Page() {
  return <Placeholder title="Lịch hẹn">Lịch hẹn lễ tân đặt giúp bạn, xếp theo ngày và theo bác sĩ.</Placeholder>
}
