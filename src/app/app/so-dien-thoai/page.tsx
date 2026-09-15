import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Số điện thoại' }

export default function Page() {
  return <Placeholder title="Số điện thoại">Số khách gọi đến, và cách chuyển cuộc gọi từ số hiện tại của phòng khám sang Fonnus.</Placeholder>
}
