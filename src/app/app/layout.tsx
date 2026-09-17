import type { ReactNode } from 'react'
import { AppShell } from '@/shell/app-shell'
import { RequireSession } from '@/session/require-session'

/**
 * Everything under `/app` is behind the session gate and inside the shell.
 *
 * This layout is a server component and the two below it are not: the gate
 * needs the session context and the shell needs the current path, so the client
 * boundary starts here and covers the whole signed-in app (ADR 0003).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      <AppShell>{children}</AppShell>
    </RequireSession>
  )
}
