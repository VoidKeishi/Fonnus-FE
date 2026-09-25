'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button, Icon, Logo } from '@/design-system'
import { NAV_GROUPS } from '@/data/content'
import type { NavGroup, NavItem } from '@/data/content'

/*
 * A floating glass pill, centred and stuck to the top at every scroll position.
 *
 * The glass is tinted cream (the card ground), not grey — that tint is what
 * keeps it reading as Fonnus rather than as a generic SaaS bar.
 * Responsiveness is a swap, not a shrink: below the `nav` breakpoint (1100px,
 * measured — see globals.css) the menus move into a drawer and the pill keeps
 * only the brand, the primary CTA and the toggle. Both shapes are in the HTML
 * and the media query picks, so the server and the first client render agree.
 *
 * The same header sits on every marketing page. A link to the page you are on
 * keeps its wash, so the header also says where you are.
 */

/** Past this scroll the pill tightens and its glass goes more opaque. */
const CONDENSE_AT = 24
/** Grace period so the pointer can cross the gap into an open menu. */
const CLOSE_DELAY_MS = 140
/** The `nav` breakpoint from globals.css; widening past it strands an open drawer. */
const WIDE_QUERY = '(min-width: 68.75rem)'

/*
 * The glass, over the alias layer: the tint and the bright edge are the card
 * ground (the prototype drew the edge in white, which no alias carries), the
 * shadow is ink, and the wash is terracotta.
 */
const GLASS_EDGE = 'border border-[color-mix(in_srgb,var(--surface-card)_70%,transparent)]'
const PILL_REST =
  'h-[68px] w-[min(1280px,100%)] bg-[color-mix(in_srgb,var(--surface-card)_72%,transparent)] backdrop-blur-[20px] ' +
  'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-card)_60%,transparent),0_12px_34px_color-mix(in_srgb,var(--text-heading)_9%,transparent),0_2px_6px_color-mix(in_srgb,var(--text-heading)_4%,transparent)]'
const PILL_SCROLLED =
  'h-[60px] w-[min(1160px,100%)] bg-[color-mix(in_srgb,var(--surface-card)_90%,transparent)] backdrop-blur-[26px] ' +
  'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-card)_70%,transparent),0_16px_40px_color-mix(in_srgb,var(--text-heading)_16%,transparent)]'
/* The open menu's wash, held for the page you are on. */
const WASH = 'bg-[color-mix(in_srgb,var(--text-eyebrow)_11%,transparent)] text-text-body'
const FAST = 'transition-colors duration-[var(--duration-fast)] ease-out'

function subscribeScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => {
    window.removeEventListener('scroll', onChange)
  }
}

/**
 * Which menu is open in the pill and whether the drawer is, with the listeners
 * that close them: Escape, and crossing the `nav` breakpoint.
 */
function useMenus() {
  const [open, setOpen] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Widening past the breakpoint would strand the drawer on screen; narrowing
  // hides the nav, so an open menu goes with it.
  useEffect(() => {
    const wide = window.matchMedia(WIDE_QUERY)
    const onChange = () => {
      if (wide.matches) setMenuOpen(false)
      else setOpen(null)
    }
    wide.addEventListener('change', onChange)
    return () => {
      wide.removeEventListener('change', onChange)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(null)
      setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(
    () => () => {
      clearTimeout(closeTimer.current)
    },
    [],
  )

  return {
    open,
    menuOpen,
    hold: (label: string) => {
      clearTimeout(closeTimer.current)
      setOpen(label)
    },
    release: () => {
      clearTimeout(closeTimer.current)
      closeTimer.current = setTimeout(() => {
        setOpen(null)
      }, CLOSE_DELAY_MS)
    },
    toggle: (label: string) => {
      setOpen((v) => (v === label ? null : label))
    },
    toggleDrawer: () => {
      setMenuOpen((v) => !v)
    },
    pick: () => {
      setOpen(null)
      setMenuOpen(false)
    },
  }
}

export function Header() {
  const pathname = usePathname()
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > CONDENSE_AT,
    () => false,
  )
  const menus = useMenus()

  return (
    <>
      {/* Same inset as a landing section, so the pill shares the content column. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-[clamp(20px,5vw,64px)] pt-[22px]">
        <div
          className={[
            'pointer-events-auto box-border flex items-center gap-[clamp(12px,2vw,28px)] rounded-pill pr-3 pl-[26px]',
            'backdrop-saturate-180',
            GLASS_EDGE,
            'transition-[height,width,background-color,box-shadow] duration-[var(--duration-base)] ease-out',
            scrolled ? PILL_SCROLLED : PILL_REST,
          ].join(' ')}
        >
          <Link
            href="/"
            aria-label={pathname === '/' ? 'Fonnus — về đầu trang' : 'Fonnus — về trang chủ'}
            className="flex shrink-0 items-center"
          >
            <Logo variant="horizontal" height={scrolled ? 23 : 26} />
          </Link>

          <nav className="mx-auto hidden items-center gap-0.5 nav:flex" onMouseLeave={menus.release}>
            {NAV_GROUPS.map((group) => (
              <GroupTrigger
                key={group.label}
                group={group}
                current={group.href === pathname}
                open={menus.open === group.label}
                onHold={() => {
                  menus.hold(group.label)
                }}
                onRelease={menus.release}
                onToggle={() => {
                  menus.toggle(group.label)
                }}
                onPick={menus.pick}
              />
            ))}
          </nav>

          <Actions drawerOpen={menus.menuOpen} onToggleDrawer={menus.toggleDrawer} />
        </div>
      </div>

      {menus.menuOpen ? <Drawer pathname={pathname} onPick={menus.pick} /> : null}
    </>
  )
}

/** Both shapes are rendered; the `nav` breakpoint shows one. */
function Actions({ drawerOpen, onToggleDrawer }: { drawerOpen: boolean; onToggleDrawer: () => void }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      <Link href="/dang-nhap" className="hidden shrink-0 no-underline nav:block">
        <Button variant="secondary" size="sm">
          Đăng nhập
        </Button>
      </Link>
      <Link href="/dang-ky" className="shrink-0 no-underline">
        <Button size="sm">
          <span className="nav:hidden">Dùng thử</span>
          <span className="hidden nav:inline">Dùng thử miễn phí</span>
        </Button>
      </Link>
      <button
        type="button"
        onClick={onToggleDrawer}
        aria-label={drawerOpen ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={drawerOpen}
        className={[
          'grid size-11 cursor-pointer place-items-center rounded-pill border-none bg-transparent text-text-body nav:hidden',
          'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-heading)_16%,transparent)] hover:bg-action-ghost-hover',
          FAST,
        ].join(' ')}
      >
        <Icon name={drawerOpen ? 'x' : 'menu'} size={19} />
      </button>
    </div>
  )
}

interface TriggerProps {
  group: NavGroup
  /** A plain link to the page being shown. */
  current: boolean
  open: boolean
  onHold: () => void
  onRelease: () => void
  onToggle: () => void
  onPick: () => void
}

const NAV_LINK = [
  'flex cursor-pointer items-center gap-1.5 rounded-pill border-none px-3.5 py-[9px]',
  'font-ui text-body-sm leading-[1.2] font-medium whitespace-nowrap no-underline',
  FAST,
].join(' ')
const NAV_LINK_IDLE = 'bg-transparent text-text-muted hover:bg-action-ghost-hover hover:text-text-body'

function GroupTrigger({ group, current, open, onHold, onRelease, onToggle, onPick }: TriggerProps) {
  if (!group.items) {
    return (
      <Link
        href={group.href ?? '/'}
        aria-current={current ? 'page' : undefined}
        className={`${NAV_LINK} ${current ? WASH : NAV_LINK_IDLE}`}
        onMouseEnter={onRelease}
      >
        {group.label}
      </Link>
    )
  }

  return (
    <div className="relative" onMouseEnter={onHold} onMouseLeave={onRelease}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`${NAV_LINK} ${open ? WASH : NAV_LINK_IDLE}`}
      >
        {group.label}
        <Icon
          name="chevron-down"
          size={12}
          className={`transition-transform duration-[var(--duration-fast)] ease-out ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className={[
            'absolute top-[calc(100%+14px)] left-1/2 box-border flex w-[340px] -translate-x-1/2 flex-col gap-0.5 rounded-[24px] p-2',
            'bg-[color-mix(in_srgb,var(--surface-card)_94%,transparent)] backdrop-blur-[24px] backdrop-saturate-180',
            'border border-[color-mix(in_srgb,var(--surface-card)_75%,transparent)]',
            'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-card)_60%,transparent),0_22px_50px_color-mix(in_srgb,var(--text-heading)_14%,transparent)]',
            'motion-safe:animate-[fnRise_180ms_var(--ease-out)]',
            // Bridges the gap between trigger and panel so the pointer never falls through.
            "before:absolute before:inset-x-0 before:-top-[14px] before:h-[14px] before:content-['']",
          ].join(' ')}
        >
          {group.items.map((item) => (
            <PanelItem key={item.label} item={item} onPick={onPick} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PanelItem({ item, onPick }: { item: NavItem; onPick: () => void }) {
  return (
    <Link
      href={item.href}
      role="menuitem"
      onClick={onPick}
      className={[
        'flex items-start gap-3 rounded-lg px-[13px] py-3 text-left font-ui text-text-body no-underline',
        'hover:bg-action-ghost-hover',
        FAST,
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-[color-mix(in_srgb,var(--text-eyebrow)_12%,transparent)] text-text-accent"
      >
        <Icon name={item.icon} size={17} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body-sm leading-(--leading-body) font-semibold">{item.label}</span>
        <span className="text-[12.5px] leading-[1.45] text-text-muted">{item.desc}</span>
      </span>
    </Link>
  )
}

const DRAWER_ROW =
  'rounded-[14px] p-3.5 text-left font-ui text-body-sm leading-(--leading-body) text-text-body no-underline hover:bg-action-ghost-hover'

/** A second glass sheet under the pill, one row per destination. */
function Drawer({ pathname, onPick }: { pathname: string; onPick: () => void }) {
  return (
    <div
      className={[
        // Tracks the rail's inset so the drawer's edges sit under the pill's.
        'fixed top-[96px] right-[clamp(20px,5vw,64px)] left-[clamp(20px,5vw,64px)] z-[39] nav:hidden',
        'box-border flex max-h-[calc(100vh-120px)] flex-col gap-1 overflow-y-auto rounded-[26px] p-3',
        'bg-[color-mix(in_srgb,var(--surface-card)_96%,transparent)] backdrop-blur-[24px] backdrop-saturate-180',
        'border border-[color-mix(in_srgb,var(--surface-card)_75%,transparent)]',
        'shadow-[0_22px_50px_color-mix(in_srgb,var(--text-heading)_18%,transparent)]',
        'motion-safe:animate-[fnRise_var(--duration-base)_var(--ease-out)]',
      ].join(' ')}
    >
      {NAV_GROUPS.map((group) =>
        group.items ? (
          <div key={group.label} className="flex flex-col pb-1.5">
            <span className="px-3.5 pt-2.5 pb-1.5 text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-muted uppercase">
              {group.label}
            </span>
            {group.items.map((item) => (
              <Link key={item.label} href={item.href} onClick={onPick} className={`${DRAWER_ROW} font-medium`}>
                {item.label}
              </Link>
            ))}
          </div>
        ) : (
          <Link
            key={group.label}
            href={group.href ?? '/'}
            onClick={onPick}
            aria-current={group.href === pathname ? 'page' : undefined}
            className={`${DRAWER_ROW} font-semibold ${group.href === pathname ? WASH : ''}`}
          >
            {group.label}
          </Link>
        ),
      )}
      <Link
        href="/dang-nhap"
        onClick={onPick}
        className={[
          'mt-1 rounded-[14px] px-3.5 py-[15px] text-center font-ui text-body-sm leading-(--leading-body) font-semibold text-text-body no-underline',
          'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-heading)_14%,transparent)] hover:bg-action-ghost-hover',
        ].join(' ')}
      >
        Đăng nhập
      </Link>
    </div>
  )
}
