'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon, Logo } from '@/design-system'
import type { IconName } from '@/design-system'
import { useSession } from '@/session/session-provider'
import { MORE_NAV, NAV, TAB_NAV, activeHref } from './nav'

/*
 * The signed-in frame.
 *
 * Three shapes of the same nav, chosen by CSS rather than by measuring the
 * window: a 216px sidebar, a 64px icon rail from 900px down, and a bottom tab
 * bar on a phone. Reading `window.innerWidth` during render is the classic
 * hydration mismatch in this codebase (CLAUDE.md), and media queries have no
 * such problem — both shapes are in the HTML and the viewport picks.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const active = activeHref(pathname)

  return (
    <div className="min-h-screen bg-surface-page rail:grid rail:grid-cols-[64px_minmax(0,1fr)] wide:grid-cols-[216px_minmax(0,1fr)]">
      <aside
        aria-label="Điều hướng"
        className="sticky top-0 hidden h-screen flex-col gap-6 bg-surface-warm px-3 py-5 shadow-[inset_-1px_0_0_var(--border-hairline)] rail:flex wide:px-4"
      >
        <Link href="/app" aria-label="Tổng quan" className="px-1.5">
          <span className="hidden wide:block">
            <Logo variant="horizontal" height={26} />
          </span>
          <span className="block wide:hidden">
            <Logo variant="mark" height={28} />
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((entry) => (
            <NavLink key={entry.href} {...entry} on={entry.href === active} />
          ))}
        </nav>

        <UserBlock />
      </aside>

      <main className="min-w-0 px-5 pt-6 pb-24 sm:px-8 rail:pb-10 wide:px-12">
        <div className="mx-auto max-w-[960px]">{children}</div>
      </main>

      <TabBar active={active} />
    </div>
  )
}

function NavLink({
  href,
  label,
  icon,
  on,
}: {
  href: string
  label: string
  icon: IconName
  on: boolean
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={on ? 'page' : undefined}
      className={[
        'flex items-center gap-3 rounded-md px-2.5 py-2.5 font-ui text-ui font-medium no-underline',
        'transition-colors duration-[var(--duration-fast)] ease-out',
        'justify-center wide:justify-start',
        on ? 'bg-surface-card text-text-accent' : 'text-text-body hover:bg-[var(--action-ghost-hover)]',
      ].join(' ')}
    >
      <Icon name={icon} size={18} />
      <span className="hidden wide:inline">{label}</span>
    </Link>
  )
}

/** Who is signed in, and the way out. */
function UserBlock() {
  const { me, signOut } = useSession()

  return (
    <div className="flex flex-col gap-2 border-t border-border-hairline pt-3">
      <div className="hidden min-w-0 flex-col px-2.5 wide:flex">
        <span className="truncate text-ui font-medium text-text-body">
          {me?.display_name ?? '…'}
        </span>
        <span className="truncate text-[12.5px] text-text-muted">{me?.clinic_name ?? ''}</span>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        title="Đăng xuất"
        className="flex cursor-pointer items-center justify-center gap-3 rounded-md border-none bg-transparent px-2.5 py-2.5 font-ui text-ui font-medium text-text-muted hover:bg-[var(--action-ghost-hover)] wide:justify-start"
      >
        <Icon name="sign-out" size={18} />
        <span className="hidden wide:inline">Đăng xuất</span>
      </button>
    </div>
  )
}

/**
 * The phone shell: four destinations at the bottom edge, thumb height, plus
 * "Thêm" for the two pages that are set up once and then left alone.
 */
function TabBar({ active }: { active: string }) {
  const [more, setMore] = useState(false)
  const { signOut } = useSession()
  const router = useRouter()
  const moreOn = MORE_NAV.some((n) => n.href === active)

  // While the sheet is up it owns the surface; letting the page scroll under
  // the thumb is the thing that makes a sheet feel broken.
  useEffect(() => {
    if (!more) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMore(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [more])

  return (
    <div className="rail:hidden">
      {more ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(38,31,24,0.38)]"
            onClick={() => {
              setMore(false)
            }}
          />
          <div
            role="dialog"
            aria-label="Thêm"
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-1 rounded-t-2xl bg-surface-card px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-overlay motion-safe:animate-[fnSheetUp_var(--duration-base)_var(--ease-out)]"
          >
            <span aria-hidden="true" className="mx-auto mb-2 h-1 w-9 rounded-pill bg-border-strong" />
            {MORE_NAV.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={() => {
                  setMore(false)
                }}
                className="flex items-center gap-3 rounded-md px-3 py-3.5 font-ui text-body-sm font-medium text-text-body no-underline"
              >
                <Icon name={entry.icon} size={19} />
                {entry.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMore(false)
                void signOut()
              }}
              className="flex cursor-pointer items-center gap-3 rounded-md border-none bg-transparent px-3 py-3.5 font-ui text-body-sm font-medium text-text-muted"
            >
              <Icon name="sign-out" size={19} />
              Đăng xuất
            </button>
          </div>
        </>
      ) : null}

      <nav
        aria-label="Điều hướng"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch bg-surface-card pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--border-hairline)]"
      >
        {TAB_NAV.map((entry) => (
          <button
            key={entry.href}
            type="button"
            onClick={() => {
              router.push(entry.href)
            }}
            aria-current={entry.href === active ? 'page' : undefined}
            className={[
              'flex flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent px-1 py-2.5',
              'font-ui text-[11.5px] font-medium',
              entry.href === active ? 'text-text-accent' : 'text-text-muted',
            ].join(' ')}
          >
            <Icon name={entry.icon} size={20} />
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setMore(true)
          }}
          className={[
            'flex flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent px-1 py-2.5',
            'font-ui text-[11.5px] font-medium',
            moreOn ? 'text-text-accent' : 'text-text-muted',
          ].join(' ')}
        >
          <Icon name="menu" size={20} />
          Thêm
        </button>
      </nav>
    </div>
  )
}
