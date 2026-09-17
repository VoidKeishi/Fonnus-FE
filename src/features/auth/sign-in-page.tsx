'use client'

import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Icon } from '@/design-system'
import { api, messageFor } from '@/api'
import type { Me } from '@/api'
import { useSession } from '@/session/session-provider'
import { AuthHeading, AuthShell } from './auth-shell'
import type { AuthBack } from './auth-shell'
import { Field, LastUsedBadge, PhoneField } from './field'
import { OtpField, OtpFooter } from './otp-field'
import { readLastMethod, rememberMethod } from './last-method'
import { formatPhone, isValidEmail, normalizePhone, phoneError } from './phone'
import { useCountdown } from './use-countdown'

/*
 * Sign-in. Two ways in, because an owner will not remember which one they used:
 * phone with an SMS code (the default) and email with the same six digits.
 * There is no password anywhere in the product.
 *
 * The one thing this door has that sign-up does not: a "Lần trước" badge on the
 * method this browser used last time. Remembering that for the owner is the
 * cheapest thing on the screen and the one they are actually looking for.
 *
 * Google sign-in is in the design and deliberately not here yet: it needs the
 * in-page chooser for mock mode and a real OAuth redirect for live mode, and a
 * button that does neither is worse than no button (PLAN.md §Roadmap).
 */
type Step = 'phone' | 'phone-otp' | 'email' | 'email-otp'

/** Long enough that a slow SMS still arrives before the resend link unlocks. */
const RESEND_SECONDS = 42

/** Top right on every step of this door. */
const SWAP = (
  <>
    Chưa có tài khoản?{' '}
    <Link href="/dang-ky" className="font-medium">
      Dùng thử miễn phí
    </Link>
  </>
)

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
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Read once, on the first client render: it must not change under the owner
  // mid-flow. Safe as a lazy initialiser rather than an effect because this
  // whole screen is a client boundary the server never renders.
  const [lastUsed] = useState(readLastMethod)

  const resend = useCountdown(RESEND_SECONDS)

  const goTo = (next: Step) => {
    setCode('')
    setCodeError(null)
    setFieldError(null)
    setStep(next)
  }

  // The server has set the session cookie: record who is in and go to the shell.
  const enterApp = useCallback(
    (me: Me) => {
      session.signIn(me)
      router.push('/app')
    },
    [session, router],
  )

  const confirmCode = useCallback(
    async (entered: string, method: 'phone' | 'email') => {
      setBusy(true)
      try {
        const identity = method === 'email' ? email : normalizePhone(phone)
        const me = await api.auth.verifyCode({ identity, code: entered })
        rememberMethod(method)
        enterApp(me)
      } catch (e) {
        // messageFor() knows the difference between a wrong code, an expired
        // one, too many tries, and the server simply being down.
        setCodeError(messageFor(e))
        setCode('')
      } finally {
        setBusy(false)
      }
    },
    [email, phone, enterApp],
  )

  async function submitPhone() {
    const problem = phoneError(phone)
    if (problem) {
      setFieldError(problem)
      return
    }

    setBusy(true)
    try {
      await api.auth.sendPhoneCode(phone)
      resend.restart()
      goTo('phone-otp')
    } catch (e) {
      setFieldError(messageFor(e))
    } finally {
      setBusy(false)
    }
  }

  async function submitEmail() {
    if (!isValidEmail(email)) {
      setFieldError('Email chưa đúng định dạng.')
      return
    }

    setBusy(true)
    try {
      await api.auth.sendEmailCode(email)
      resend.restart()
      goTo('email-otp')
    } catch (e) {
      setFieldError(messageFor(e))
    } finally {
      setBusy(false)
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
          label: step === 'email' ? 'Dùng số điện thoại' : 'Quay lại',
          onClick: () => {
            goTo(step === 'email-otp' ? 'email' : 'phone')
          },
        }

  return (
    <AuthShell swap={SWAP} panel={panel} {...(back ? { back } : {})}>
      {renderStep()}
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
                badge={lastUsed === 'phone' ? <LastUsedBadge /> : null}
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

            {/* A quiet link, not a second button: this screen has one action,
                and a second control of equal weight is only a second way to
                hesitate. */}
            <div className="flex flex-col items-center gap-3.5">
              <span className="flex w-full items-center gap-3 text-ui text-text-muted before:h-px before:flex-1 before:bg-border-hairline before:content-[''] after:h-px after:flex-1 after:bg-border-hairline after:content-['']">
                hoặc
              </span>
              <button
                type="button"
                onClick={() => {
                  goTo('email')
                }}
                className="inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 font-ui text-ui font-medium text-text-link hover:underline"
              >
                <Icon name="mail" size={15} />
                Đăng nhập bằng email
                {lastUsed === 'email' ? <LastUsedBadge /> : null}
              </button>
            </div>
          </>
        )

      case 'phone-otp':
        return (
          <>
            <AuthHeading title="Nhập mã 6 số">
              Đã gửi SMS tới <Num>{formatPhone(phone)}</Num> ·{' '}
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
              onComplete={(entered) => void confirmCode(entered, 'phone')}
              error={codeError}
              disabled={busy}
            />

            <OtpFooter
              secondsLeft={resend.left}
              onResend={() => {
                resend.restart()
                // A resend that fails silently is right here: the countdown has
                // restarted either way, and the owner's next move is to wait.
                void api.auth.sendPhoneCode(phone).catch(() => undefined)
              }}
            />
          </>
        )

      case 'email':
        return (
          <>
            <AuthHeading title="Đăng nhập bằng email">
              Mã đăng nhập sẽ được gửi tới hộp thư của bạn.
            </AuthHeading>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                void submitEmail()
              }}
            >
              <Field
                label="Email"
                type="email"
                placeholder="lan@vietsmile.vn"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setFieldError(null)
                }}
                autoComplete="email"
                autoFocus
                error={fieldError}
              />
              <Button type="submit" size="lg" fullWidth disabled={busy}>
                {busy ? 'Đang gửi…' : 'Gửi mã tới email'}
              </Button>
            </form>
          </>
        )

      case 'email-otp':
        return (
          <>
            <AuthHeading title="Kiểm tra hộp thư">
              Mã 6 số đã gửi tới <b className="font-semibold text-text-body">{email}</b> ·{' '}
              <InlineButton
                onClick={() => {
                  goTo('email')
                }}
              >
                Đổi email
              </InlineButton>
            </AuthHeading>

            <OtpField
              value={code}
              onChange={setCode}
              onComplete={(entered) => void confirmCode(entered, 'email')}
              error={codeError}
              disabled={busy}
            />

            <OtpFooter
              secondsLeft={resend.left}
              onResend={() => {
                resend.restart()
                void api.auth.sendEmailCode(email).catch(() => undefined)
              }}
              note="Không thấy email? Kiểm tra mục Spam."
            />
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
