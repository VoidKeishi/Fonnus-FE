import type { IconName } from '@/design-system'

/**
 * The six destinations of the signed-in app, in the order the sidebar shows
 * them. One list, read by the sidebar, the icon rail and the phone tab bar, so
 * the three can never drift apart.
 */
export interface NavEntry {
  href: string
  label: string
  icon: IconName
}

export const NAV: readonly NavEntry[] = [
  { href: '/app', label: 'Tổng quan', icon: 'overview' },
  { href: '/app/cuoc-goi', label: 'Cuộc gọi', icon: 'answered' },
  { href: '/app/lich-hen', label: 'Lịch hẹn', icon: 'appointment' },
  { href: '/app/le-tan', label: 'Lễ tân', icon: 'caller' },
  { href: '/app/so-dien-thoai', label: 'Số điện thoại', icon: 'incoming' },
  { href: '/app/cai-dat', label: 'Cài đặt', icon: 'settings' },
]

/*
 * On a phone the rail becomes a bottom tab bar, and a bar has room for four
 * destinations plus a way to the rest. These four are the ones an owner opens
 * on their feet; the number and the account are configured once and live behind
 * "Thêm", with the sign-out.
 */
export const TAB_NAV = NAV.slice(0, 4)
export const MORE_NAV = NAV.slice(4)

/** The entry a path belongs to. `/app/le-tan/ho-so` is still Lễ tân. */
export function activeHref(pathname: string): string {
  const match = NAV.filter((n) => n.href !== '/app').find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`),
  )
  return match?.href ?? '/app'
}
