import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthHeading, AuthShell } from '@/auth/auth-shell'
import { Placeholder } from '@/ui/placeholder'

export const metadata: Metadata = { title: 'Dùng thử miễn phí' }

/**
 * Sign-up shares every part of sign-in — the same pill field, the same six
 * digits — and adds the clinic's name and the Terms line. It is the next screen
 * to build (PLAN.md §Roadmap), and until then it says so rather than pretending.
 */
export default function Page() {
  return (
    <AuthShell
      swap={
        <>
          Đã có tài khoản?{' '}
          <Link href="/dang-nhap" className="font-medium">
            Đăng nhập
          </Link>
        </>
      }
    >
      <AuthHeading title="Dùng thử miễn phí">
        Mở tài khoản bằng số điện thoại của phòng khám.
      </AuthHeading>
      <Placeholder title="Đăng ký">
        Màn đăng ký dùng chung luồng mã 6 số với đăng nhập. Trong lúc chờ, bạn
        đăng nhập bằng số đã đăng ký giúp mình nhé.
      </Placeholder>
    </AuthShell>
  )
}
