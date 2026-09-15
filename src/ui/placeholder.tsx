import type { ReactNode } from 'react'

/**
 * A route that exists but is not built yet.
 *
 * It says what the screen will do, in the product's own voice, rather than
 * "Coming soon" or an empty page: the route tree is walkable today, and anyone
 * clicking through can see the shape of the product without being told a
 * half-built screen is finished.
 *
 * Every use of this is a row in PLAN.md. Deleting the last one closes the
 * roadmap.
 */
export function Placeholder({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex max-w-[560px] flex-col gap-3 rounded-xl border border-dashed border-border-dashed bg-surface-card px-7 py-8">
      <h1 className="m-0 font-display text-subheading font-semibold tracking-display text-text-heading">
        {title}
      </h1>
      <p className="m-0 text-body-sm text-text-muted">{children}</p>
      <p className="m-0 text-ui text-text-muted">Màn hình này đang được dựng.</p>
    </section>
  )
}
