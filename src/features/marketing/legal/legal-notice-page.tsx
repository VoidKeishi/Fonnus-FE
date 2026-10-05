import Link from 'next/link'
import { CONTACT, LEGAL_PAGES } from '@/data/content'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_HEADING, SECTION_INNER, TEXT_LINK } from '../sections/section-chrome'

/**
 * A legal document's page while its text is not written yet: what the document
 * is, that it is not published, whom to ask, and where to go instead. It says
 * nothing about what the document will contain, so no sentence here reads as a
 * commitment.
 *
 * A server component with no reveal: one short block, already on screen when
 * the page paints.
 */
export function LegalNoticePage({ doc }: { doc: keyof typeof LEGAL_PAGES }) {
  const page = LEGAL_PAGES[doc]
  return (
    <main>
      {/* First on its page, so it clears the floating pill the way the hotline page does.
          The minimum height keeps the night footer off the middle of a tall screen. */}
      <section
        className={`${SECTION_BAND} min-h-[70svh] bg-surface-page pt-[clamp(132px,17vh,168px)] max-[900px]:pt-[116px]`}
      >
        <div className={SECTION_INNER}>
          <div className="max-w-[56ch]">
            <div className={SECTION_EYEBROW}>Pháp lý</div>
            <h1 className={`${SECTION_HEADING} mb-6`}>{page.title}</h1>
            <p className="m-0 mb-5 text-body-lg text-text-muted">
              Chúng tôi đang hoàn thiện văn bản này và sẽ đăng tại đây ngay khi có bản chính thức.
            </p>
            <p className="m-0 mb-6 text-body text-text-body">
              {page.contactQuestion} Viết cho chúng tôi qua{' '}
              <a href={CONTACT.emailHref} className={TEXT_LINK}>
                {CONTACT.email}
              </a>{' '}
              hoặc gọi{' '}
              <a href={CONTACT.phoneHref} className={`${TEXT_LINK} font-num tabular-nums`}>
                {CONTACT.phone}
              </a>
              .
            </p>
            {/* Each row is a 44px tap target on a phone. */}
            <ul className="m-0 flex list-none flex-col p-0 text-body">
              {page.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={`${TEXT_LINK} inline-flex min-h-11 items-center`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
