import type { Metadata } from 'next'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Lễ tân' }

export default function Page() {
  return <Placeholder title="Lễ tân">Nơi bạn dạy lễ tân về phòng khám: hồ sơ, kiến thức và kỹ năng. Mỗi mục là một phần lễ tân sẽ dùng khi nghe máy.</Placeholder>
}
