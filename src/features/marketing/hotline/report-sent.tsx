import type { Ref } from 'react'
import { Button, Icon } from '@/design-system'

const STEP =
  "relative grid grid-cols-[36px_minmax(0,1fr)] items-center gap-3 py-1.5 text-body-sm leading-[1.5] text-text-body [&+&]:before:absolute [&+&]:before:top-[-6px] [&+&]:before:left-[17.5px] [&+&]:before:h-3 [&+&]:before:w-px [&+&]:before:bg-border-strong [&+&]:before:content-['']"

const STEP_ICON = 'relative z-[1] grid size-9 place-items-center rounded-pill'
const STEP_ICON_WAITING = `${STEP_ICON} bg-surface-card text-text-muted shadow-[inset_0_0_0_1px_var(--border-hairline)]`
/* A terracotta ground takes the icon to one colour, or its accent vanishes into it. */
const STEP_ICON_DONE = `${STEP_ICON} bg-action-primary text-text-on-accent [--icon-accent:currentColor]`

interface ReportSentProps {
  email: string
  count: number
  /** Takes the focus when the panel arrives, so a screen reader announces the result. */
  titleRef: Ref<HTMLHeadingElement>
  onAgain: () => void
}

/** The thanks, with what happens next drawn as the three steps it is. */
export function ReportSent({ email, count, titleRef, onAgain }: ReportSentProps) {
  return (
    /* Close to the form's height, so the page does not jump on send. */
    <div role="status" className="flex min-h-[380px] flex-col items-start justify-center gap-4">
      {/* Sage, not blush: blush is Linh's speech (docs/ui-ux-principles.md §1). */}
      <span className="grid size-12 place-items-center rounded-pill bg-surface-sage text-text-heading [--icon-accent:var(--success)]">
        <Icon name="done" size={28} />
      </span>
      <h3 ref={titleRef} tabIndex={-1} className="m-0 font-display text-heading font-semibold text-text-heading outline-none">
        Đã nhận yêu cầu
      </h3>
      <p className="m-0 text-body text-text-muted">
        Báo cáo sẽ gửi về <b className="font-semibold wrap-anywhere text-text-heading">{email}</b>.
      </p>

      <ol className="mt-1 mb-2 flex w-full list-none flex-col p-0">
        <li className={STEP}>
          <span className={STEP_ICON_DONE}>
            <Icon name="check" size={16} />
          </span>
          Đã gửi thông tin
        </li>
        <li className={STEP}>
          <span className={STEP_ICON_WAITING}>
            <Icon name="answered" size={18} />
          </span>
          {count > 1 ? `Gọi thử ${String(count)} cơ sở, mỗi nơi 5–7 lần, trong vài ngày` : 'Gọi thử 5–7 lần trong vài ngày'}
        </li>
        <li className={STEP}>
          <span className={STEP_ICON_WAITING}>
            <Icon name="report" size={18} />
          </span>
          Nhận báo cáo qua email
        </li>
      </ol>

      <Button variant="ghost" onClick={onAgain}>
        Gửi cho phòng khám khác
      </Button>
    </div>
  )
}
