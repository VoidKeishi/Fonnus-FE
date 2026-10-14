'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import Link from 'next/link'
import { MAX_EMAIL_LENGTH, MAX_NAME_LENGTH, api, isCanceled } from '@/api'
import type { WaitlistInput } from '@/api'
import { Button, Icon, buttonClassName } from '@/design-system'
import { CONTACT } from '@/data/content'
import { Field, PhoneField } from './waitlist-field'
import {
  EMPTY_WAITLIST,
  fieldErrorsFrom,
  firstInvalid,
  sendErrorFrom,
  sentNumberLabel,
  validateWaitlist,
  waitlistFrom,
  withoutError,
} from './waitlist-fields'
import type { WaitlistErrors, WaitlistField } from './waitlist-fields'
import { WaitlistPanel } from './waitlist-panel'

const RISE = 'motion-safe:animate-[fnRise_620ms_var(--ease-arc)_both]'

const TITLE =
  'm-0 font-display text-[36px] leading-[1.25] font-semibold tracking-display text-balance text-text-heading max-[901px]:text-[30px] max-[561px]:text-[28px]'

/** The dash length `fnDraw` starts from, per stroke of the seal. */
function drawLength(length: number): CSSProperties {
  return { '--draw-length': String(length) } as CSSProperties
}

/**
 * `/waitlist`: the form a visitor fills after "Vào danh sách chờ", beside the
 * night panel. The sign-in door's split — the form leads and is first for the
 * keyboard, the panel takes 43% up to 620px — except that on a phone the panel
 * stacks under the form instead of going.
 *
 * A field's problem sits under that field, anything else under the button, and
 * the form keeps what was typed. Once sent, the form gives way to the
 * thank-you, and the night log gains the visitor's own row, which stays when
 * they start over for another clinic.
 */
export function WaitlistPage() {
  const [fields, setFields] = useState<WaitlistInput>(EMPTY_WAITLIST)
  const [errors, setErrors] = useState<WaitlistErrors>({})
  const [sendError, setSendError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<WaitlistInput | null>(null)
  const [joined, setJoined] = useState<{ name: string } | null>(null)

  const formRef = useRef<HTMLFormElement | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  // Set by "Đăng ký đơn khác", read once when the fresh form mounts.
  const focusFirstFieldOnMount = useRef(false)

  // A send still running when the page unmounts must not land on nothing.
  useEffect(() => () => inFlight.current?.abort(), [])

  function focusField(field: WaitlistField) {
    const input = formRef.current?.elements.namedItem(field)
    if (input instanceof HTMLInputElement) input.focus()
  }

  const attachForm = useCallback((form: HTMLFormElement | null) => {
    formRef.current = form
    if (!form || !focusFirstFieldOnMount.current) return
    focusFirstFieldOnMount.current = false
    const first = form.elements.namedItem('contact_name')
    if (first instanceof HTMLInputElement) first.focus()
  }, [])

  // The thank-you only ever mounts after a send, so arriving is the moment to
  // move the focus: a screen reader announces the result instead of silence.
  const focusOnArrival = useCallback((title: HTMLHeadingElement | null) => {
    title?.focus()
  }, [])

  const edit = (field: WaitlistField) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setFields((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] === undefined ? prev : withoutError(prev, field)))
    setSendError(null)
  }

  async function submit() {
    if (busy) return
    const invalid = validateWaitlist(fields)
    const firstWrong = firstInvalid(invalid)
    if (firstWrong !== undefined) {
      setErrors(invalid)
      focusField(firstWrong)
      return
    }

    const entry = waitlistFrom(fields)
    const controller = new AbortController()
    inFlight.current = controller
    setBusy(true)
    setSendError(null)
    try {
      await api.leads.joinWaitlist(entry, { signal: controller.signal })
      setSent(entry)
      setJoined({ name: entry.contact_name })
    } catch (e) {
      if (isCanceled(e)) return
      const refused = fieldErrorsFrom(e)
      const firstRefused = firstInvalid(refused)
      if (firstRefused === undefined) {
        setSendError(sendErrorFrom(e))
      } else {
        setErrors(refused)
        focusField(firstRefused)
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null
      setBusy(false)
    }
  }

  function startOver() {
    focusFirstFieldOnMount.current = true
    setFields(EMPTY_WAITLIST)
    setErrors({})
    setSendError(null)
    setSent(null)
  }

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)_clamp(420px,43%,620px)] bg-surface-page max-[901px]:grid-cols-[minmax(0,1fr)]">
      <main className="flex min-w-0 flex-col px-[clamp(20px,5vw,64px)] pt-7 pb-[26px] max-[901px]:px-5 max-[901px]:pt-5 max-[901px]:pb-7">
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-[5px] font-ui text-ui font-medium text-text-muted no-underline transition-colors duration-[120ms] ease-out hover:text-text-body"
          >
            {/* One arrow glyph in the set; here it points back. */}
            <Icon name="arrow-right" size={15} className="rotate-180" />
            Trang chủ
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center pt-3 pb-5 max-[901px]:items-start max-[901px]:pt-7 max-[901px]:pb-8">
          <div className="w-full max-w-[460px]">{sent ? renderSent(sent) : renderForm()}</div>
        </div>

        <p className="m-0 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[12.5px] leading-normal text-text-muted">
          <span>Dữ liệu phòng khám lưu tại Việt Nam</span>
          <span aria-hidden="true" className="opacity-50 max-[1181px]:hidden">
            ·
          </span>
          <span className="whitespace-nowrap">
            Cần hỗ trợ?{' '}
            <a href={CONTACT.phoneHref} className="font-num font-medium tabular-nums">
              {CONTACT.phone}
            </a>{' '}
            (gọi hoặc Zalo)
          </span>
        </p>
      </main>

      <WaitlistPanel joined={joined} />
    </div>
  )

  function renderForm() {
    return (
      <>
        {/* The entrance stagger; delays are written inline because they are composition, not style. */}
        <p
          className={`m-0 text-eyebrow font-semibold tracking-eyebrow text-text-eyebrow uppercase ${RISE}`}
          style={{ animationDelay: '50ms' }}
        >
          Danh sách chờ
        </p>
        <h1 className={`mt-2.5 ${TITLE} ${RISE}`} style={{ animationDelay: '150ms' }}>
          Vào danh sách chờ
        </h1>
        <p className={`mt-2 mb-0 text-[15px] leading-[1.6] text-text-muted ${RISE}`} style={{ animationDelay: '250ms' }}>
          Fonnus mở theo từng đợt để mỗi phòng khám được cài đặt kỹ. Chúng tôi gọi khi đến lượt bạn.
        </p>

        <form
          ref={attachForm}
          noValidate
          className={`mt-[30px] flex flex-col gap-4 ${RISE}`}
          style={{ animationDelay: '380ms' }}
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <Field
            name="contact_name"
            label="Họ và tên"
            placeholder="Nguyễn Thị Lan"
            autoComplete="name"
            // The server's cap, so a pasted name is cut here rather than refused there.
            maxLength={MAX_NAME_LENGTH}
            value={fields.contact_name}
            onChange={edit('contact_name')}
            error={errors.contact_name}
          />
          <PhoneField
            name="phone"
            label="Số điện thoại"
            placeholder="090 123 45 67"
            value={fields.phone}
            onChange={edit('phone')}
            error={errors.phone}
          />
          <Field
            name="email"
            label="Email"
            type="email"
            placeholder="lan@phongkham.vn"
            autoComplete="email"
            maxLength={MAX_EMAIL_LENGTH}
            value={fields.email}
            onChange={edit('email')}
            error={errors.email}
          />
          <Button type="submit" size="lg" fullWidth disabled={busy} className="mt-1.5 h-[54px]">
            {busy ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="none"
                  aria-hidden="true"
                  focusable="false"
                  className="shrink-0 motion-safe:animate-[fnSpin_0.9s_linear_infinite]"
                >
                  <path d="M5.5 12A6.5 6.5 0 0 1 18.5 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                Đang gửi…
              </>
            ) : (
              'Vào danh sách chờ'
            )}
          </Button>
          {sendError === null ? null : (
            <p role="alert" className="m-0 text-ui leading-(--leading-body) text-error">
              {sendError}
            </p>
          )}
          <p className="m-0 text-center text-[13px] leading-normal text-text-muted">
            Chúng tôi chỉ dùng thông tin này để liên hệ với bạn về Fonnus.
          </p>
        </form>
      </>
    )
  }

  function renderSent(entry: WaitlistInput) {
    return (
      <>
        {/* The ring closes, then the tick. At rest both are drawn, so reduced motion shows the finished seal. */}
        <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden="true" focusable="false" className="block">
          <circle
            cx="32"
            cy="32"
            r="27"
            fill="none"
            stroke="var(--text-eyebrow)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="170"
            transform="rotate(-90 32 32)"
            className="motion-safe:animate-[fnDraw_1.1s_var(--ease-arc)_0.1s_both]"
            style={drawLength(170)}
          />
          <circle cx="32" cy="32" r="18" fill="var(--text-heading)" />
          <path
            d="M24.5 32.5l5 5 10-10.5"
            fill="none"
            stroke="var(--text-on-accent)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="40"
            className="motion-safe:animate-[fnDraw_0.5s_var(--ease-arc)_0.9s_both]"
            style={drawLength(40)}
          />
        </svg>
        <h1 ref={focusOnArrival} tabIndex={-1} className={`mt-2.5 outline-none ${TITLE}`}>
          Bạn đã có tên trong danh sách.
        </h1>
        <div className="mt-[22px] flex flex-col items-start gap-4 motion-safe:animate-[fnRise_var(--duration-arc)_var(--ease-arc)_both]">
          <p className="m-0 text-[16px] leading-[1.6] break-words text-text-muted">
            Cảm ơn {entry.contact_name}. Khi đến lượt, Fonnus sẽ gọi số{' '}
            <b className="font-num font-semibold whitespace-nowrap text-text-heading">{sentNumberLabel(entry.phone)}</b> và
            gửi hướng dẫn tới{' '}
            {/* Not nowrap like the number: an address of up to 254 characters would push a phone page sideways. */}
            <b className="font-num font-semibold [overflow-wrap:anywhere] text-text-heading">{entry.email}</b>.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="secondary" className="h-[46px]" onClick={startOver}>
              Đăng ký đơn khác
            </Button>
            <Link href="/" className={`${buttonClassName({ variant: 'secondary' })} h-[46px]`}>
              Về trang chủ
            </Link>
          </div>
        </div>
      </>
    )
  }
}
