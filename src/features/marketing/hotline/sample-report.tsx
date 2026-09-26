import type { CSSProperties } from 'react'
import { Icon } from '@/design-system'
import { SAMPLE_REPORT } from '@/data/hotline-report'

/* Inside a block still waiting to lift in, a bar waits at zero; then they fill in order. */
const FILL =
  'absolute inset-y-0 left-0 w-(--you) rounded-[inherit] bg-chart-step-5 transition-[width] delay-[calc(var(--i)*90ms+240ms)] duration-(--duration-arc) ease-arc motion-reduce:transition-none [[data-reveal-armed]_[data-reveal]:not([data-revealed])_&]:w-0'

const KEY = 'inline-flex items-center gap-2 text-[12.5px] leading-(--leading-body) text-text-muted'

/**
 * What the visitor gets, drawn rather than described: the four things every
 * test call is scored on, each against the national average. Sample figures,
 * and the card says so. A server component.
 */
export function SampleReport() {
  return (
    <figure data-reveal="1" className="m-0 min-w-0 [grid-area:preview]">
      <div className="rounded-lg bg-surface-page p-[clamp(20px,2.6vw,28px)]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-hairline pb-4">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-pill bg-surface-card text-text-accent">
            <Icon name="report" size={20} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-accent uppercase">
              Báo cáo mẫu
            </span>
            <span className="font-display text-[18px] leading-[1.3] font-semibold text-text-heading">Nha khoa của bạn</span>
          </span>
          <span className="text-ui leading-(--leading-body) whitespace-nowrap text-text-muted">Điểm / 100</span>
        </div>

        {/* Name and score on one line, the bar under both (docs/visual-language.md, Charts). */}
        <ul className="m-0 flex list-none flex-col gap-4 px-0 pt-[18px] pb-0">
          {SAMPLE_REPORT.map((metric, i) => (
            <li
              key={metric.key}
              style={{ '--you': `${String(metric.you)}%`, '--avg': `${String(metric.average)}%`, '--i': i } as CSSProperties}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2"
            >
              <span className="inline-flex min-w-0 items-center gap-2 text-body-sm leading-[1.4] text-text-heading">
                <span className="inline-flex flex-none text-text-muted">
                  <Icon name={metric.icon} size={16} />
                </span>
                {metric.label}
              </span>
              <span className="font-num text-num leading-(--leading-body) font-semibold tabular-nums text-text-heading">
                {metric.you}
                <span className="sr-only">, trung bình {metric.average}</span>
              </span>
              {/* The unfilled part is a paler step of the same hue, never grey. */}
              <span aria-hidden="true" className="relative col-span-full h-2.5 rounded-pill bg-meter-track">
                <span className={FILL} />
                {/* The national average: an ink tick standing across the bar, ringed in paper so it reads over the fill. */}
                <span className="absolute -inset-y-1 left-(--avg) -ml-[1.5px] w-[3px] rounded-[2px] bg-text-heading shadow-[0_0_0_2px_var(--surface-page)]" />
              </span>
            </li>
          ))}
        </ul>

        <div aria-hidden="true" className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-border-hairline pt-4">
          <span className={KEY}>
            <span className="h-2 w-4 rounded-pill bg-chart-step-5" />
            Phòng khám của bạn
          </span>
          <span className={KEY}>
            <span className="h-3.5 w-[3px] rounded-[2px] bg-text-heading" />
            Trung bình toàn quốc
          </span>
        </div>
      </div>

      <figcaption className="mx-0.5 mt-4 mb-0 text-body-sm text-text-muted">
        Bạn nhận một báo cáo chi tiết, so với hàng chục nghìn cuộc gọi tới các phòng khám khắp Việt Nam — thấy rõ mình
        đang đứng ở đâu, và cải thiện chỗ nào thì được nhiều nhất.
      </figcaption>
    </figure>
  )
}
