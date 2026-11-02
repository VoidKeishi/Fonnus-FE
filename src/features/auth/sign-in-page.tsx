'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/design-system'
import { api, fieldMessageFor, formatPhone, isApiError, messageFor, normalizePhone, phoneError } from '@/api'
import { useSession } from '@/session/session-provider'
import { AuthHeading, AuthShell } from './auth-shell'
import type { AuthBack } from './auth-shell'
import { PhoneField } from './field'
import { OtpField, OtpFooter } from './otp-field'
import { useCountdown } from './use-countdown'

/*
 * Sign-in: a mobile number and the six digits Fonnus-BE texts to it. There is
 * no password anywhere in the product, and no other door yet — Fonnus-BE signs
 * in by mobile number only, and a control that does nothing is worse than none
 * (ADR 0011). Email and Google return with F1b, when the backend serves them.
 */
type Step = 'phone' | 'phone-otp'

/** Top right on every step of this door. */
const SWAP = (
  <Link href="/waitlist" className="font-medium">
    Vào danh sách chờ
  </Link>
)

/** The words in the "no account" sentence that lead to the waitlist. */
const WAITLIST_PHRASE = 'danh sách chờ'

/**
 * The line under the number. A number with no account is told where to go,
 * so "danh sách chờ" in that sentence is the way there; the sentence itself
 * stays in `errors.ts` with every other one.
 */
function sendErrorLine(e: unknown): ReactNode {
  // One box and no marks: a refusal named on the field reads as its own sentence.
  const line = fieldMessageFor(e)
  const at = line.indexOf(WAITLIST_PHRASE)
  if (!isApiError(e) || e.code !== 'mobile_number_not_found' || at < 0) return line
  return (
    <>
      {line.slice(0, at)}
      <Link href="/waitlist" className="font-medium">
        {WAITLIST_PHRASE}
      </Link>
      {line.slice(at + WAITLIST_PHRASE.length)}
    </>
  )
}

/**
 * `panel` arrives as a prop rather than an import so it can stay a server
 * component: this file is a client boundary, and everything it imports is
 * pulled into the browser bundle with it. The panel is fixed copy and has no
 * reason to be there.
 */
export function SignInPage({ panel }: { panel?: ReactNode }) {
  const session = useSession()
  const router = useRouter()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  /** The number the backend sent the code to, in its own normalised form. */
  const [sentTo, setSentTo] = useState('')
  /** The backend's last cooldown, which a resend restarts with before it answers. */
  const [cooldown, setCooldown] = useState(0)
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<ReactNode>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const resend = useCountdown()

  // An owner who is already in has no use for this door.
  const signedIn = session.status === 'authenticated'
  useEffect(() => {
    if (signedIn) router.replace('/app')
  }, [signedIn, router])

  const goTo = (next: Step) => {
    setCode('')
    setCodeError(null)
    setFieldError(null)
    setStep(next)
  }

  const { signIn } = session
  const confirmCode = useCallback(
    async (entered: string) => {
      setBusy(true)
      try {
        const me = await api.auth.verifyLoginOtp({ mobile_number: sentTo, code: entered })
        // The backend has set the session cookies: record who is in and go to
        // the shell. `replace`, so Back from `/app` does not return here.
        signIn(me)
        router.replace('/app')
      } catch (e) {
        // fieldMessageFor() knows the difference between a wrong code, an
        // expired one, a refused number, and the server simply being down.
        setCodeError(fieldMessageFor(e))
        setCode('')
      } finally {
        setBusy(false)
      }
    },
    [sentTo, signIn, router],
  )

  async function submitPhone() {
    const problem = phoneError(phone)
    if (problem) {
      setFieldError(problem)
      return
    }

    setBusy(true)
    try {
      const sent = await api.auth.requestLoginOtp(normalizePhone(phone))
      setSentTo(sent.mobile_number)
      setCooldown(sent.resend_after_seconds)
      resend.restart(sent.resend_after_seconds)
      goTo('phone-otp')
    } catch (e) {
      setFieldError(sendErrorLine(e))
    } finally {
      setBusy(false)
    }
  }

  /*
   * The countdown restarts at once so the link cannot be pressed twice while
   * the request is out, then settles on what the backend counted: its answer
   * on success, the last cooldown on a 429. An SMS it could not deliver does
   * not count towards its cooldown (Fonnus-BE AC-07), so the link reopens with
   * the error. A resend that fails says so where the code goes.
   */
  async function resendCode() {
    resend.restart(cooldown)
    setCodeError(null)
    try {
      const sent = await api.auth.requestLoginOtp(sentTo)
      setCooldown(sent.resend_after_seconds)
      resend.restart(sent.resend_after_seconds)
    } catch (e) {
      if (!isApiError(e) || e.code !== 'otp_rate_limited') resend.restart(0)
      setCodeError(messageFor(e))
    }
  }

  /*
   * Where "quay lại" goes, per step. On the first step there is nowhere back
   * inside the flow, so the shell's own default — the landing page — stands.
   */
  const back: AuthBack | null =
    step === 'phone'
      ? null
      : {
          label: 'Quay lại',
          onClick: () => {
            goTo('phone')
          },
        }

  /*
   * While the probe is out, a browser that signed in recently is almost
   * certainly about to be sent on to `/app`, so the form stays out of sight
   * rather than flash, and the slot says what is happening — the same line
   * the app's own gate shows, since a slow probe can take seconds; every other
   * visitor gets the form at once. The hint only picks what to draw — the
   * redirect waits for the probe.
   */
  const formHidden = signedIn || (session.status === 'checking' && session.hint)

  return (
    <AuthShell swap={SWAP} panel={panel} {...(back ? { back } : {})}>
      {formHidden ? <p className="m-0 text-body-sm text-text-muted">Đang mở phòng khám của bạn…</p> : renderStep()}
    </AuthShell>
  )

  function renderStep() {
    switch (step) {
      case 'phone':
        return (
          <>
            <AuthHeading title="Đăng nhập">Mã đăng nhập sẽ được gửi qua SMS.</AuthHeading>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                void submitPhone()
              }}
            >
              <PhoneField
                label="Số điện thoại"
                placeholder="090 123 45 67"
                value={formatPhone(phone)}
                onChange={(e) => {
                  setPhone(normalizePhone(e.target.value).slice(0, 10))
                  setFieldError(null)
                }}
                autoFocus
                error={fieldError}
              />
              <Button type="submit" size="lg" fullWidth disabled={busy}>
                {busy ? 'Đang gửi…' : 'Gửi mã đăng nhập'}
              </Button>
            </form>
          </>
        )

      case 'phone-otp':
        return (
          <>
            <AuthHeading title="Nhập mã 6 số">
              Đã gửi SMS tới <Num>{formatPhone(sentTo)}</Num> ·{' '}
              <InlineButton
                onClick={() => {
                  goTo('phone')
                }}
              >
                Đổi số
              </InlineButton>
            </AuthHeading>

            <OtpField
              value={code}
              onChange={setCode}
              onComplete={(entered) => void confirmCode(entered)}
              error={codeError}
              disabled={busy}
            />

            <OtpFooter secondsLeft={resend.left} onResend={() => void resendCode()} />
          </>
        )
    }
  }
}

function Num({ children }: { children: ReactNode }) {
  return <span className="font-num font-semibold tabular-nums text-text-body">{children}</span>
}

function InlineButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer border-none bg-transparent p-0 font-ui text-inherit font-medium text-text-link hover:underline"
    >
      {children}
    </button>
  )
}
