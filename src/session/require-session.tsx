'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Logo } from '@/design-system'
import { messageFor } from '@/api'
import { useSession } from './session-provider'

/**
 * The gate on everything under `/app`.
 *
 * It runs in the browser, not in middleware: in mock mode the session lives in
 * localStorage and there is no cookie for a middleware to read (ADR 0003), so a
 * server-side gate would bounce every demo login. Once the cookie is real this
 * becomes a second line of defence rather than the only one — the backend
 * already refuses an unauthenticated request, and nothing here is secret.
 *
 * Three states, three screens. "Unreachable" is not "signed out": an owner
 * whose office wifi dropped gets a retry, not a sign-in form.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status, error, hint, recheck } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'anonymous' && !error) router.replace('/dang-nhap')
  }, [status, error, router])

  if (status === 'authenticated') return <>{children}</>

  if (error) {
    return (
      <Centered>
        <p className="m-0 max-w-[420px] text-body-sm text-text-muted">{messageFor(error)}</p>
        <Button onClick={recheck}>Thử lại</Button>
      </Centered>
    )
  }

  /*
   * `hint` says this browser signed in recently, so the probe will almost
   * certainly come back "yes" — waiting quietly is right. Without it, the honest
   * thing is to say nothing at all and let the redirect happen.
   */
  return (
    <Centered>
      {hint ? <p className="m-0 text-body-sm text-text-muted">Đang mở phòng khám của bạn…</p> : null}
    </Centered>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface-page px-6 text-center">
      <Logo variant="mark" height={34} />
      {children}
    </div>
  )
}
