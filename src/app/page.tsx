import Link from 'next/link'
import { Button, Logo } from '@/design-system'

/**
 * The landing page, as a placeholder that is still honest about the product.
 *
 * The real one — hero with the orb, the recorded greeting, pricing, the whole
 * scroll — is the largest screen in the design and is its own roadmap step
 * (PLAN.md §Roadmap F4). What is here says what Fonnus does and opens both
 * doors, on the cream ground, in the right faces.
 */
export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center gap-7 px-6 py-16">
      <Logo variant="horizontal" height={34} className="self-start" />

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
