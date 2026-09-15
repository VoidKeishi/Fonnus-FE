import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Cài đặt' }

export default function Page() {
  return <Placeholder title="Cài đặt">Tài khoản, gói dịch vụ, hoá đơn, và những người khác trong phòng khám được xem.</Placeholder>
}
