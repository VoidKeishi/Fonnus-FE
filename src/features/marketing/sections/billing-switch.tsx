'use client'

import { Switch } from '@/design-system'
import { useBillingPeriod } from './billing-period'

/** The head's monthly/annual switch. */
export function BillingSwitch() {
  const { annual, toggle } = useBillingPeriod()
  return <Switch label="Trả năm, giảm 15%" checked={annual} onChange={toggle} className="min-w-[220px]" />
}
