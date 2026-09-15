import Link from 'next/link'
import { Logo } from '@/design-system'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface-page px-6 text-center">
      <Logo variant="horizontal" height={30} />
      <h1 className="m-0 font-display text-heading font-semibold tracking-display text-text-heading">
        Không tìm thấy trang này
      </h1>
      <p className="m-0 max-w-[420px] text-body-sm text-text-muted">
        Có thể đường dẫn đã thay đổi. Bạn quay về trang chủ rồi thử lại giúp mình nhé.
      </p>
      <Link href="/" className="font-ui text-ui font-medium text-text-link hover:underline">
        Về trang chủ
      </Link>
    </main>
  )
}
