'use client'

import { useCallback, useEffect, useState } from 'react'

/** Resend lock. Returns the seconds left and a reset for "gửi lại mã". */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => {
      setLeft((n) => n - 1)
    }, 1000)
    return () => {
      window.clearTimeout(id)
    }
  }, [left])

  const restart = useCallback(() => {
    setLeft(seconds)
  }, [seconds])

  return { left, restart }
}
