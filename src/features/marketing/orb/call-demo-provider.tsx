'use client'

import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import { useCallDemoState } from './use-call-demo'
import type { CallDemo } from './use-call-demo'

const CallDemoContext = createContext<CallDemo | null>(null)

/**
 * The call demo, shared by the header ("Nghe thử Linh") and the orb, which both
 * open it. Mounted in the marketing layout around header, page and footer; the
 * layout itself stays a server component.
 */
export function CallDemoProvider({ children }: { children: ReactNode }) {
  const demo = useCallDemoState()
  return <CallDemoContext value={demo}>{children}</CallDemoContext>
}

export function useCallDemo(): CallDemo {
  const demo = use(CallDemoContext)
  if (!demo) throw new Error('useCallDemo is used outside CallDemoProvider')
  return demo
}
