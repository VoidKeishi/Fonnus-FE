import { Badge, Icon } from '@/design-system'

const CALLS = [
  { number: '0903 ••• 217', meta: '2 phút · tư vấn niềng răng', outcome: 'Đã đặt lịch', booked: true },
  { number: '0938 ••• 044', meta: '1 phút · hỏi bảng giá', outcome: 'Đã trả lời', booked: false },
  { number: '0911 ••• 882', meta: '3 phút · đặt lịch ngoài giờ', outcome: 'Đã đặt lịch', booked: true },
]

/** Nhật ký cuộc gọi — the call log as the owner sees it next morning. A server component. */
export function CallLogVisual() {
  return (
    <div className="rounded-lg bg-surface-card p-6 shadow-[inset_0_0_0_1px_var(--border-hairline)]">
      <div className="mb-[18px] flex items-center justify-between">
        <span className="text-ui leading-(--leading-body) text-text-muted">Hôm nay</span>
        <span className="font-num text-ui leading-(--leading-body) tabular-nums text-text-muted">14 cuộc gọi</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {CALLS.map((call) => (
          <div key={call.number} className="flex items-center gap-3.5 rounded-md bg-surface-page px-4 py-3.5">
            <span className="grid size-[34px] place-items-center rounded-[10px] bg-surface-rose text-text-accent">
              <Icon name="incoming" size={18} />
            </span>
            <span className="flex-1">
              <span className="block font-num text-num leading-(--leading-body) font-medium tabular-nums">
                {call.number}
              </span>
              <span className="block text-ui leading-(--leading-body) text-text-muted">{call.meta}</span>
            </span>
            <Badge tone={call.booked ? 'terracotta' : 'neutral'}>{call.outcome}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
