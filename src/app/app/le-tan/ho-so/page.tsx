import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Hồ sơ' }

export default function Page() {
  return <Placeholder title="Hồ sơ phòng khám">Tên phòng khám, địa chỉ, giờ mở cửa, bác sĩ và dịch vụ — những thông tin lễ tân trả lời hằng ngày.</Placeholder>
}
