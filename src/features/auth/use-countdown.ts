'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Resend lock. Returns the seconds left and a restart for "gửi lại mã".
 *
 * Starts at zero and takes its length on each restart, from the backend's
 * `resend_after_seconds`: the cooldown is the backend's, and a second number
 * here would drift from it.
 */
export function useCountdown() {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => {
      setLeft((n) => n - 1)
    }, 1000)
    return () => {
      window.clearTimeout(id)
    }
  }, [left])

  const restart = useCallback((seconds: number) => {
    setLeft(Math.max(0, Math.round(seconds)))
  }, [])

  return { left, restart }
}
