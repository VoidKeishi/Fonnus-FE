'use client'

import { createContext, use, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface BillingPeriod {
  annual: boolean
  toggle: () => void
}

const BillingPeriodContext = createContext<BillingPeriod | null>(null)

/**
 * Monthly or annual, for the whole pricing section. The switch sits in the
 * section's head and the prices in four cards below it, so the state is held
 * above both; everything between — the head's copy, the cards' names, features
 * and buttons — is server-rendered and passes through as `children`.
 */
export function BillingPeriodProvider({ children }: { children: ReactNode }) {
  const [annual, setAnnual] = useState(false)
  const toggle = useCallback(() => {
    setAnnual((v) => !v)
  }, [])
  const value = useMemo(() => ({ annual, toggle }), [annual, toggle])
  return <BillingPeriodContext value={value}>{children}</BillingPeriodContext>
}

export function useBillingPeriod(): BillingPeriod {
  const period = use(BillingPeriodContext)
  if (!period) throw new Error('useBillingPeriod is used outside BillingPeriodProvider')
  return period
}
