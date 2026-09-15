import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Kiến thức' }

export default function Page() {
  return <Placeholder title="Kiến thức">Giá dịch vụ, bảo hiểm, chính sách và những câu khách hay hỏi.</Placeholder>
}
