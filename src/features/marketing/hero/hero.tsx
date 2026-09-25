import { Pattern } from '@/design-system'
import { CLINIC_LOGOS, ClinicMark } from './clinic-logos'
import { SignUpForm } from './sign-up-form'

/*
 * A mask reads only alpha, so any opaque colour would do; the alias is there so
 * the gradient carries no hex. Centred on the orb's half, it fades out well
 * before the headline column.
 */
const DOTS_MASK =
  'radial-gradient(circle at 76% 44%, var(--text-heading) 0%, color-mix(in srgb, var(--text-heading) 55%, transparent) 16%, transparent 38%)'

/**
 * Three things and nothing else: the claim, one control to sign up, and the
 * orb — which is the product, not an illustration of it. A server component:
 * only the sign-up form holds state.
 *
 * At ≤900px the hero is one column, deliberately re-ordered: claim → orb →
 * sign-up. On a phone the orb is what stops the scroll, so it goes above the
 * form rather than below it. `display: contents` dissolves the claim wrapper so
 * its children become grid items the orb can be ordered between; the gap is 0
 * so each element keeps the vertical rhythm its own margin already sets. The
 * breakpoints are written as `max-width` media queries because the design's
 * 900px and 560px are inclusive, which Tailwind's `max-*` (`width <`) is not.
 */
export function Hero() {
  return (
    <section
      id="hero"
      className={[
        // Same side inset as every section below, so the headline shares their left edge.
        'relative isolate box-border flex min-h-screen items-center overflow-clip',
        'px-[clamp(20px,5vw,64px)] pt-[140px] pb-[72px]',
        '[@media(max-width:900px)]:min-h-auto [@media(max-width:900px)]:px-5 [@media(max-width:900px)]:pt-[116px] [@media(max-width:900px)]:pb-16',
      ].join(' ')}
    >
      {/* Two soft washes, both clay, anchoring the orb's half of the composition. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[60px] -right-[140px] z-0 size-[1020px] rounded-[50%] bg-[radial-gradient(circle,color-mix(in_srgb,var(--text-eyebrow)_15%,transparent)_0%,color-mix(in_srgb,var(--text-eyebrow)_6%,transparent)_42%,transparent_68%)] [@media(max-width:900px)]:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[320px] -left-[220px] z-0 size-[760px] rounded-[50%] bg-[radial-gradient(circle,color-mix(in_srgb,var(--surface-warm)_55%,transparent)_0%,transparent_70%)] [@media(max-width:900px)]:hidden"
      />
      {/* Chấm nhịp behind the orb only: the one terracotta dot per tile is the
          call that got answered. `!` because Pattern sets `display` inline. */}
      <Pattern
        name="dots"
        className="text-text-heading"
        style={{ zIndex: -1, maskImage: DOTS_MASK, WebkitMaskImage: DOTS_MASK }}
      />

      {/* Same 1280px inner column every other section uses. */}
      <div className="relative z-1 mx-auto grid w-full max-w-[1280px] grid-cols-2 items-center gap-x-[clamp(32px,5vw,64px)] gap-y-0 [@media(max-width:900px)]:grid-cols-1 [@media(max-width:900px)]:justify-items-center [@media(max-width:900px)]:gap-0 [@media(max-width:900px)]:text-center">
        <div className="relative z-1 flex flex-col items-start [@media(max-width:900px)]:contents">
          <h1 className="m-0 font-display text-[length:clamp(40px,4.7vw,68px)] leading-[1.2] font-semibold tracking-[-0.02em] text-balance text-text-heading [@media(max-width:900px)]:order-1">
            Không cuộc gọi
            <br />
            nào bị <span className="text-text-eyebrow">bỏ lỡ.</span>
          </h1>

          <p className="m-0 mt-[26px] max-w-[30ch] text-body-lg leading-[1.55] text-text-muted [@media(max-width:900px)]:order-2 [@media(max-width:900px)]:mt-[18px]">
            Lễ tân AI nghe máy cho phòng khám của bạn 24/7, bằng tiếng Việt.
          </p>

          <SignUpForm />

          <p className="m-0 mt-4 text-ui leading-(--leading-body) text-text-muted [@media(max-width:900px)]:order-5">
            Miễn phí 14 ngày · Không cần thẻ ngân hàng
          </p>
        </div>

        {/*
          End, not center: the claim fills its own left edge, so a centred orb
          leaves dead column on the outside and the hero reads as shifted left.
          Flush-right puts the orb's edge on the column edge the headline starts
          from. Single column at ≤900px, where it stands down to centre.
        */}
        <div className="relative z-1 flex flex-col items-center gap-[26px] justify-self-end [@media(max-width:900px)]:order-3 [@media(max-width:900px)]:mt-[26px] [@media(max-width:900px)]:justify-self-center">
          {/* Empty, not the orb: the orb is mounted once by `landing.tsx`,
              outside every section, so it can fly to the corner and into the
              call without restarting. This box only tells it where "docked"
              is and how big to be; it finds the box by `data-orb-dock`. */}
          <div data-orb-dock="" aria-hidden="true" className="size-[clamp(208px,24vw,344px)] rounded-[50%]" />
          <p className="m-0 max-w-[42ch] text-center text-body-sm text-text-muted">
            Bấm để nghe Linh trả lời ngay trên trình duyệt.
            <br />
            Không cần cài đặt, không cần để lại số.
          </p>
        </div>

        {/* Spans both columns: its hairline bridges the headline's edge to the
            orb's, which is what stops the two halves reading as separate. */}
        <div className="col-span-full mt-11 flex w-full items-center gap-3 border-t border-border-hairline pt-6 [@media(max-width:900px)]:order-6 [@media(max-width:900px)]:mt-7 [@media(max-width:900px)]:justify-center">
          {/* Spaced, not stacked: an avatar-style overlap hides the glyphs that identify them. */}
          <div className="flex flex-none gap-[7px]">
            {CLINIC_LOGOS.map((logo) => (
              <span key={logo.name} className="block rounded-[50%] shadow-[0_0_0_2px_var(--surface-page)]">
                <ClinicMark logo={logo} size={30} />
              </span>
            ))}
          </div>
          <span className="text-ui leading-[1.5] text-text-muted">
            50+ phòng khám ở TP.HCM và Hà Nội đang để Fonnus nghe máy
          </span>
        </div>
      </div>
    </section>
  )
}
