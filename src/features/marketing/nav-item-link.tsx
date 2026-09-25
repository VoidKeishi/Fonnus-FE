import Link from 'next/link'
import type { ReactNode } from 'react'
import type { NavItem } from '@/data/content'

/** Opens the call demo; undefined on a page without it. */
export type OnDemo = (() => void) | undefined

interface NavItemLinkProps {
  item: NavItem
  onPick: () => void
  onDemo: OnDemo
  role?: 'menuitem'
  className: string
  children: ReactNode
}

/**
 * One entry of the header's menus: a link to the item's page — or, for the
 * demo item on the page that has the demo, a button that opens the call.
 */
export function NavItemLink({ item, onPick, onDemo, role, className, children }: NavItemLinkProps) {
  const openDemo = item.demo ? onDemo : undefined
  if (!openDemo) {
    return (
      <Link href={item.href} role={role} onClick={onPick} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <button
      type="button"
      role={role}
      onClick={() => {
        onPick()
        openDemo()
      }}
      className={`${className} w-full cursor-pointer border-none bg-transparent`}
    >
      {children}
    </button>
  )
}
