import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/design-system'

export const metadata: Metadata = { title: { absolute: 'Fonnus — Không cuộc gọi nào bị bỏ lỡ.' } }

/**
 * The landing page, as a placeholder that is still honest about the product,
 * until the hero replaces it (PLAN.md §Roadmap F4). The top padding clears the
 * fixed header pill (22px inset + 68px pill).
 */
export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center gap-7 px-6 pt-[120px] pb-16">
      <h1 className="m-0 font-display text-display font-semibold tracking-display text-text-heading">
        Lễ tân AI nghe máy cho phòng khám, 24/7.
      </h1>

      <p className="m-0 max-w-[560px] text-body-lg text-text-muted">
        Fonnus nghe và trả lời cuộc gọi đến bằng tiếng Việt, trả lời giá và giờ
        mở cửa, đặt lịch hẹn, và ghi lại mọi cuộc gọi cho bạn xem lại. Không cuộc
        gọi nào bị bỏ lỡ, kể cả ngoài giờ.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dang-ky">
          <Button size="lg">Dùng thử miễn phí</Button>
        </Link>
        <Link href="/dang-nhap">
          <Button size="lg" variant="secondary">
            Đăng nhập
          </Button>
        </Link>
      </div>
    </main>
  )
}
