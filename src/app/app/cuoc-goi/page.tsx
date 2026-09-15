import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Cuộc gọi' }

export default function Page() {
  return <Placeholder title="Cuộc gọi">Toàn bộ cuộc gọi lễ tân đã nghe: ai gọi, hỏi gì, kết thúc ra sao, kèm bản ghi và bản chép lời.</Placeholder>
}
