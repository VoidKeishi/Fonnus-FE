import Link from 'next/link'
import { Logo, Pattern } from '@/design-system'
import { CONTACT, FOOTER_PAGE_LINKS } from '@/data/content'

const LINK = 'text-text-on-inverse no-underline hover:underline'

/*
 * The night footer every marketing page ends on.
 *
 * `data-theme="dark"` scopes the night palette to this block, which is what
 * turns the accent aliases (`--text-eyebrow`, `--icon-accent`) into the
 * night terracotta the reference asks for on a night ground. No alias carries
 * that colour on a light page.
 *
 * The "Trang" column appears once the first section it can link to has landed
 * (`FOOTER_PAGE_LINKS`); a column of nothing would be a dead end.
 */
export function Footer() {
  return (
    <footer
      data-theme="dark"
      className="relative isolate overflow-hidden bg-surface-inverse px-[clamp(20px,5vw,64px)] pt-[clamp(48px,8vh,80px)] pb-10 text-text-on-inverse"
    >
      {/* Night takes the dots only. */}
      <Pattern name="night-dots" style={{ zIndex: -1 }} />
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-start justify-between gap-10">
        <div className="max-w-[34ch]">
          <Logo variant="mark-dark" height={36} className="mb-5" />
          <p className="m-0 mb-3 font-display text-subheading font-semibold">Không cuộc gọi nào bị bỏ lỡ.</p>
          <p className="m-0 text-body-sm text-text-muted-on-inverse">
            Fonnus mong muốn trở thành hệ thống lễ tân đáng tin cậy của nền kinh tế Việt Nam.
          </p>
        </div>

        <div className="flex flex-wrap gap-[clamp(32px,5vw,72px)] text-body-sm leading-(--leading-body)">
          {FOOTER_PAGE_LINKS.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <span className="text-eyebrow leading-(--leading-body) tracking-eyebrow text-text-eyebrow uppercase">Trang</span>
              {FOOTER_PAGE_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={LINK}>
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-2.5">
            <span className="text-eyebrow leading-(--leading-body) tracking-eyebrow text-text-eyebrow uppercase">Liên hệ</span>
            <a href={CONTACT.phoneHref} className={`${LINK} font-num tabular-nums`}>
              {CONTACT.phone}
            </a>
            <a href={CONTACT.emailHref} className={LINK}>
              {CONTACT.email}
            </a>
            <span className="text-text-muted-on-inverse">{CONTACT.site}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-[1280px] pt-6 text-ui leading-(--leading-body) text-text-muted-on-inverse shadow-[inset_0_1px_0_var(--border-on-inverse)]">
        © 2026 Fonnus
      </div>
    </footer>
  )
}
