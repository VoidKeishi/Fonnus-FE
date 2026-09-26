import { Icon } from '@/design-system'
import type { IconName } from '@/design-system'

/*
 * The two list controls of the prototype's app kit that the hotline form uses,
 * ported for this page (marketing never imports `src/ui/`): the add pill that
 * sits in a list's head, and the square icon button a row deletes with.
 */

/** `+ Thêm <the thing>`, in the list's head, pinned right (docs/ui-ux-principles.md §2). */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[30px] flex-none cursor-pointer appearance-none items-center gap-1 rounded-pill border-none bg-transparent pr-2.5 pl-2 font-ui text-[13px] font-medium whitespace-nowrap text-text-accent transition-[background-color] duration-(--duration-fast) ease-out hover:bg-action-ghost-hover"
    >
      <Icon name="plus" size={13} />
      {label}
    </button>
  )
}

/** An icon with its name on hover and for a screen reader; `danger` turns rose on hover. */
export function IconButton({
  name,
  label,
  onClick,
  danger = false,
}: {
  name: IconName
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        'inline-grid size-[30px] flex-none cursor-pointer appearance-none place-items-center rounded-sm border-none bg-transparent text-text-muted',
        'transition-[background-color,color] duration-(--duration-fast) ease-out',
        danger ? 'hover:bg-surface-rose hover:text-error' : 'hover:bg-action-ghost-hover hover:text-text-accent',
      ].join(' ')}
    >
      <Icon name={name} size={16} />
    </button>
  )
}
