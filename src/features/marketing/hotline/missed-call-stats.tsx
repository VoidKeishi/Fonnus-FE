import type { CSSProperties } from 'react'
import { Icon, buttonClassName } from '@/design-system'
import { CALL_REASONS, MISSED_BY_HOUR, MISSED_OVERALL, STUDY, WORKING_HOURS } from '@/data/hotline-report'
import { SECTION_BAND, SECTION_EYEBROW, SECTION_INNER } from '../sections/section-chrome'
import { StackedColumns } from './stacked-columns'
import type { StackedColumn } from './stacked-columns'

/*
 * Two cards, two drawings, no paragraphs. Both are one hue in two steps
 * (docs/visual-language.md, Charts — pink against green is the pair a
 * colour-blind owner cannot separate), and the share of the day is a grid of a
 * hundred dots, because "33 of these 100 calls" is read at a glance by anyone,
 * where a third of a ring has to be estimated.
 */

const COLUMNS: StackedColumn[] = MISSED_BY_HOUR.map((h) => ({
  key: h.time,
  tick: h.time,
  share: h.missed,
  shareLabel: `${String(h.missed)}%`,
  restLabel: `${String(100 - h.missed)}%`,
  tip: {
    head: `Lúc ${h.time}`,
    value: `${String(h.missed)}% không ai nghe`,
    // The one thing the column does not already print: the share as calls.
    meta: `Cứ 10 cuộc gọi, ${String(Math.round(h.missed / 10))} cuộc không ai nghe`,
  },
}))

const DOTS = Array.from({ length: 100 }, (_, i) => i < MISSED_OVERALL)

const CARD =
  'flex min-w-0 flex-col rounded-lg bg-surface-card p-[clamp(20px,3.2vw,40px)] shadow-[inset_0_0_0_1px_var(--border-hairline)]'
const CARD_LABEL =
  'mb-3.5 flex items-center gap-2 text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-muted uppercase'
const CARD_TITLE =
  'm-0 font-display text-[length:clamp(22px,2.2vw,28px)] leading-[1.3] font-semibold text-balance text-text-heading'
/* Both cards end on the same line, whatever sits above. */
const FOOT = 'mt-auto border-t border-border-hairline pt-5'
const KEY = 'inline-flex items-center gap-2 text-ui leading-(--leading-body) text-text-muted'

const DOT = 'size-3.5 rounded-pill max-[380px]:size-3'
/* Until the card has risen every call looks answered; then the missed ones turn, in reading order. */
const DOT_MISSED = `${DOT} bg-action-primary transition-colors delay-[calc(var(--i)*16ms+320ms)] duration-(--duration-slow) ease-arc motion-reduce:transition-none [[data-reveal-armed]_[data-reveal]:not([data-revealed])_&]:bg-chart-step-2`

interface MissedCallStatsProps {
  /** The id of the head's call to action, which the page's floating copy watches. */
  ctaId: string
  /** The form section the calls to action lead to. */
  formId: string
}

/** "Phòng khám nào cũng bỏ lỡ nhiều cuộc gọi hơn mình nghĩ" — the case, before the ask. A server component. */
export function MissedCallStats({ ctaId, formId }: MissedCallStatsProps) {
  return (
    // First on its page, so it clears the floating pill the way the hero does.
    <section id="so-lieu" className={`${SECTION_BAND} pt-[clamp(132px,17vh,168px)] max-[900px]:pt-[116px]`}>
      <div className={SECTION_INNER}>
        {/* A row turned into a column restates stretch (CLAUDE.md), then left-aligns the button. */}
        <div className="mb-[clamp(36px,5vw,56px)] flex items-end justify-between gap-x-14 gap-y-7 max-[900px]:flex-col max-[900px]:items-stretch">
          <div className="min-w-0">
            <div data-reveal="0" className={SECTION_EYEBROW}>
              Chấm điểm hotline
            </div>
            {/* One step under the hero's claim: this page's headline, but not the brand's. */}
            <h1
              data-reveal="1"
              className="m-0 mb-5 max-w-[19ch] font-display text-[length:clamp(36px,4.4vw,60px)] leading-[1.2] font-semibold tracking-[-0.02em] text-balance text-text-heading"
            >
              Phòng khám nào cũng bỏ lỡ <span className="text-text-eyebrow">nhiều cuộc gọi hơn</span> mình nghĩ
            </h1>
            <p data-reveal="2" className="m-0 max-w-[54ch] text-body-lg text-text-muted">
              Một khảo sát đã gọi thử hơn <b className="font-num font-semibold tabular-nums text-text-heading">{STUDY.practices}</b>{' '}
              phòng khám nha khoa ở {STUDY.region}, như bệnh nhân thật. Kết quả khiến chính các phòng khám bất ngờ.
            </p>
          </div>

          <div
            id={ctaId}
            data-reveal="3"
            className="mb-1 flex flex-none flex-col items-center gap-3 max-[900px]:mb-0 max-[900px]:items-start"
          >
            <a href={`#${formId}`} className={buttonClassName({ size: 'lg' })}>
              Nhận báo cáo miễn phí
              {/* A 20px box around the 18px glyph: the prototype's Button sizes its icon slot by the button's size. */}
              <span className="inline-flex size-5 shrink-0">
                <Icon name="chevron-down" size={18} />
              </span>
            </a>
            <span className="text-ui leading-(--leading-body) text-text-muted">Miễn phí · Điền trong 1 phút</span>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-(--gap-card) max-[900px]:grid-cols-[minmax(0,1fr)]">
          <article data-reveal="0" className={CARD}>
            <div className={CARD_LABEL}>
              <Icon name="hours" size={18} />
              Theo giờ trong ngày
            </div>
            <h2 className={CARD_TITLE}>Ngay trong giờ làm việc, hơn 1/3 cuộc gọi không ai nghe</h2>
            <p className="mt-2.5 mb-0 text-body-sm text-text-muted">Lễ tân đang bận, nghỉ trưa, hay tiếp bệnh nhân tại quầy.</p>

            <div className="mt-9">
              <StackedColumns
                columns={COLUMNS}
                label="Tỉ lệ cuộc gọi không ai nghe theo giờ trong ngày"
                bracket={{ ...WORKING_HOURS, label: 'Giờ làm việc' }}
              />
            </div>

            <div aria-hidden="true" className={`${FOOT} flex flex-wrap gap-x-5 gap-y-2`}>
              <span className={KEY}>
                <span className="size-2.5 rounded-[3px] bg-action-primary" />
                Không ai nghe
              </span>
              <span className={KEY}>
                <span className="size-2.5 rounded-[3px] bg-chart-step-2" />
                Có người nghe
              </span>
            </div>
          </article>

          <article data-reveal="1" className={CARD}>
            <div className={CARD_LABEL}>
              <Icon name="missed" size={18} />
              Tính chung cả ngày
            </div>
            <h2 className={CARD_TITLE}>Lỡ một ít mỗi ngày, cả tháng là rất nhiều khách</h2>

            <div className="mt-8 mb-7 flex flex-wrap items-center justify-between gap-x-9 gap-y-6">
              <div className="flex min-w-0 flex-[1_1_150px] flex-col">
                <span className="font-display text-[length:clamp(64px,7vw,96px)] leading-[1.2] font-semibold tracking-[-0.03em] text-text-eyebrow">
                  {MISSED_OVERALL}%
                </span>
                <span className="text-body leading-[1.4] font-semibold text-text-heading">cuộc gọi không ai nghe</span>
                <span className="mt-3.5 border-t border-border-hairline pt-3 text-ui leading-(--leading-body) text-text-muted">
                  <b className="font-num font-semibold tabular-nums text-text-heading">{100 - MISSED_OVERALL}%</b> có người
                  nghe
                </span>
              </div>

              {/* A hundred calls, ten to a row. The missed ones come first, so the count reads as rows. */}
              <div
                role="img"
                aria-label={`Cứ 100 cuộc gọi, ${String(MISSED_OVERALL)} cuộc không ai nghe`}
                className="grid flex-none grid-cols-[repeat(10,14px)] gap-[7px] max-[380px]:grid-cols-[repeat(10,12px)] max-[380px]:gap-1.5"
              >
                {DOTS.map((missed, i) => (
                  <span
                    // The grid is a fixed hundred that never reorders: its position is its identity.
                    key={i}
                    className={missed ? DOT_MISSED : `${DOT} bg-chart-step-2`}
                    style={{ '--i': i } as CSSProperties}
                  />
                ))}
              </div>
            </div>

            <div className={FOOT}>
              <p className="m-0 mb-3 text-ui leading-(--leading-body) text-text-muted">Người gọi không chỉ muốn đặt lịch</p>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {CALL_REASONS.map((reason) => (
                  <li
                    key={reason.label}
                    className="inline-flex items-center gap-[7px] rounded-pill bg-surface-page py-[7px] pr-3.5 pl-2.5 text-ui leading-[1.3] font-medium text-text-heading"
                  >
                    <Icon name={reason.icon} size={16} />
                    {reason.label}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
