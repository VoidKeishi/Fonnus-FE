'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import Link from 'next/link'
import { api, isCanceled } from '@/api'
import type { LeadInput } from '@/api'
import { Button, Icon, Input } from '@/design-system'
import { CONTACT } from '@/data/content'
import {
  EMPTY_LEAD,
  fieldErrorsFrom,
  firstInvalid,
  leadFrom,
  sendErrorFrom,
  validateLead,
  withoutError,
} from './lead-fields'
import type { LeadErrors, LeadField } from './lead-fields'
import { TEXT_LINK } from './section-chrome'

/**
 * The form half of "Liên hệ", and the "Đã nhận thông tin" panel that replaces
 * it once sent.
 *
 * The landing page has no toast surface, and should not: someone who just
 * typed their phone number needs to see what happened to it. So a field's
 * problem sits under that field, anything else sits under the button, and the
 * form keeps what was typed.
 */
export function ContactForm() {
  const [fields, setFields] = useState<LeadInput>(EMPTY_LEAD)
  const [errors, setErrors] = useState<LeadErrors>({})
  const [sendError, setSendError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const formRef = useRef<HTMLFormElement | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  // Set by "Gửi thông tin khác", read once when the fresh form mounts.
  const focusFirstFieldOnMount = useRef(false)

  // A send still running when the section unmounts must not land on nothing.
  useEffect(() => () => inFlight.current?.abort(), [])

  function focusField(field: LeadField) {
    const input = formRef.current?.elements.namedItem(field)
    if (input instanceof HTMLInputElement) input.focus()
  }

  const attachForm = useCallback((form: HTMLFormElement | null) => {
    formRef.current = form
    if (!form || !focusFirstFieldOnMount.current) return
    focusFirstFieldOnMount.current = false
    const first = form.elements.namedItem('clinic_name')
    if (first instanceof HTMLInputElement) first.focus()
  }, [])

  // The panel only ever mounts after a send, so arriving is the moment to
  // move the focus: a screen reader announces the result instead of silence.
  const focusOnArrival = useCallback((title: HTMLHeadingElement | null) => {
    title?.focus()
  }, [])

  const edit = (field: LeadField) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setFields((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] === undefined ? prev : withoutError(prev, field)))
    setSendError(null)
  }

  async function submit() {
    if (busy) return
    const invalid = validateLead(fields)
    const firstWrong = firstInvalid(invalid)
    if (firstWrong !== undefined) {
      setErrors(invalid)
      focusField(firstWrong)
      return
    }

    const controller = new AbortController()
    inFlight.current = controller
    setBusy(true)
    setSendError(null)
    try {
      await api.leads.submit(leadFrom(fields), { signal: controller.signal })
      setSent(true)
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
    setFields(EMPTY_LEAD)
    setErrors({})
    setSendError(null)
    setSent(false)
  }

  if (sent) {
    return (
      /* The success state keeps close to the card's height, so the page does not jump on send. */
      <div className="flex min-h-[300px] flex-col items-start justify-center gap-4">
        {/* Sage, not blush: blush is Linh's speech (docs/ui-ux-principles.md §1). */}
        <span className="grid size-12 place-items-center rounded-pill bg-surface-sage text-text-heading [--icon-accent:var(--success)]">
          <Icon name="done" size={28} />
        </span>
        <h3
          ref={focusOnArrival}
          tabIndex={-1}
          className="m-0 font-display text-heading font-semibold tracking-normal text-text-heading outline-none"
        >
          Đã nhận thông tin
        </h3>
        <p className="m-0 text-body text-text-muted">
          Chúng tôi sẽ gọi lại trong 24 giờ. Nếu cần gấp, gọi trực tiếp {CONTACT.phone}.
        </p>
        <Button variant="ghost" onClick={startOver}>
          Gửi thông tin khác
        </Button>
      </div>
    )
  }

  return (
    <form
      ref={attachForm}
      className="flex flex-col gap-4.5"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Input
        name="clinic_name"
        label="Tên phòng khám"
        placeholder="Nha khoa Minh Anh"
        autoComplete="organization"
        value={fields.clinic_name}
        onChange={edit('clinic_name')}
        error={errors.clinic_name}
      />
      <Input
        name="contact_name"
        label="Tên bạn"
        placeholder="Nguyễn Minh Anh"
        autoComplete="name"
        value={fields.contact_name}
        onChange={edit('contact_name')}
        error={errors.contact_name}
      />
      <Input
        name="phone"
        label="Số điện thoại"
        placeholder="090 123 45 67"
        numeric
        inputMode="tel"
        autoComplete="tel"
        value={fields.phone}
        onChange={edit('phone')}
        error={errors.phone}
        hint="Chúng tôi chỉ gọi, không nhắn tin quảng cáo."
      />
      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? 'Đang gửi…' : 'Gửi thông tin'}
      </Button>
      {sendError === null ? null : (
        <p role="alert" className="m-0 text-ui leading-(--leading-body) text-error">
          {sendError}
        </p>
      )}
      <p className="m-0 text-ui leading-(--leading-body) text-text-muted">
        Không cần chờ gọi lại:{' '}
        <Link href="/dang-ky" className={TEXT_LINK}>
          dùng thử miễn phí 14 ngày
        </Link>{' '}
        hoặc{' '}
        <Link href="/#hero" className={TEXT_LINK}>
          nghe thử ngay
        </Link>
        .
      </p>
    </form>
  )
}
