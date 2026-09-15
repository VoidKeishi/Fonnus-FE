import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Kỹ năng' }

export default function Page() {
  return <Placeholder title="Kỹ năng">Cách lễ tân chào, đặt lịch, chuyển máy và xử lý khi không trả lời được.</Placeholder>
}
