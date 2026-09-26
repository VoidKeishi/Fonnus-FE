'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { api, isCanceled } from '@/api'
import { Button, Icon, Input } from '@/design-system'
import { sendErrorFrom } from '../sections/lead-fields'
import { AddButton, IconButton } from './list-buttons'
import {
  EMPTY_PERSON,
  MAX_LOCATIONS,
  emptyLocation,
  firstProblem,
  locationKey,
  refusedProblems,
  reportFrom,
  validateReport,
} from './report-fields'
import type { LocationPart, LocationRow, PersonDraft, PersonField, Problems } from './report-fields'
import { ReportSent } from './report-sent'
import { appearRow, useAppear } from './use-appear'

interface Sent {
  email: string
  count: number
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The form card of "Để Fonnus gọi thử hotline của bạn", and the "Đã nhận yêu
 * cầu" panel that replaces it once sent. "Gửi cho phòng khám khác" mounts a
 * fresh form, so nothing typed for the last clinic carries over.
 */
export function ReportRequestCard() {
  const [sent, setSent] = useState<Sent | null>(null)
  const [round, setRound] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)

  // The panel only mounts after a send: the focus moves to it so a screen
  // reader announces the result, and the card comes back into view because the
  // thanks is shorter than the form and would leave the visitor in the footer.
  const focusOnArrival = useCallback((title: HTMLHeadingElement | null) => {
    if (!title) return
    title.focus({ preventScroll: true })
    cardRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [])

  return (
    <div
      ref={cardRef}
      data-reveal="1"
      className="min-w-0 scroll-mt-[110px] rounded-lg bg-surface-page p-[clamp(20px,3vw,36px)] [grid-area:form]"
    >
      {sent ? (
        <ReportSent
          email={sent.email}
          count={sent.count}
          titleRef={focusOnArrival}
          onAgain={() => {
            setSent(null)
            setRound((r) => r + 1)
          }}
        />
      ) : (
        <ReportForm key={round} focusOnMount={round > 0} onSent={setSent} />
      )}
    </div>
  )
}

const PAIR = 'grid items-start gap-x-3.5 gap-y-[18px] @max-[520px]/hotline-form:grid-cols-[minmax(0,1fr)]'

/**
 * Who you are, and which numbers to ring. The locations are a list in the
 * house shape: the add button in the list's head, each location an entry with
 * its ordinal and its delete, rows that grow in and collapse out.
 *
 * Errors appear when a field is left, not while it is typed, and disappear the
 * moment it is fixed; a submit shows them all and focuses the first. A server
 * refusal lands on the field it names. The rules are `report-fields.ts`.
 */
function ReportForm({ focusOnMount, onSent }: { focusOnMount: boolean; onSent: (sent: Sent) => void }) {
  // Row ids come from `useId` and a counter, so the first row's id — rendered
  // on the server — is the same when the client hydrates.
  const baseId = useId()
  const nextRow = useRef(1)
  const [person, setPerson] = useState<PersonDraft>(EMPTY_PERSON)
  const [locations, setLocations] = useState<LocationRow[]>(() => [emptyLocation(`${baseId}-row-0`)])
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())
  const [tried, setTried] = useState(false)
  const [refused, setRefused] = useState<Problems>(() => new Map())
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  const focusNext = useRef<string | null>(null)
  const { listRef: rowsRef, leave: leaveRow, leaving: rowsLeaving } = useAppear(locations.map((row) => row.id))
  // The rows on screen when an answer arrives, which the submit's own closure cannot see.
  const presentRowIds = useRef<readonly string[]>([])
  useEffect(() => {
    presentRowIds.current = locations.map((row) => row.id)
  }, [locations])

  const issues = validateReport({ ...person, locations })
  const shown = (key: string) => refused.get(key) ?? (tried || touched.has(key) ? issues.get(key) : undefined)
  const domId = (key: string) => (key.includes('/') ? key.replace('/', '-') : `${baseId}-${key}`)

  // A send still running when the form unmounts must not land on nothing.
  useEffect(() => () => inFlight.current?.abort(), [])

  useEffect(() => {
    if (focusOnMount) document.getElementById(`${baseId}-contact_name`)?.focus()
  }, [focusOnMount, baseId])

  // A new location's address takes the caret once its row is in the DOM.
  useEffect(() => {
    const id = focusNext.current
    if (id === null) return
    focusNext.current = null
    document.getElementById(id)?.focus()
  }, [locations])

  function focusField(key: string) {
    document.getElementById(domId(key))?.focus()
  }

  const touch = (key: string) => () => {
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)))
  }

  function edited(key: string) {
    setFailure(null)
    setRefused((r) => {
      if (!r.has(key)) return r
      const next = new Map(r)
      next.delete(key)
      return next
    })
  }

  const setPersonField = (field: PersonField) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setPerson((p) => ({ ...p, [field]: value }))
    edited(field)
  }

  const setLocationField = (id: string, part: LocationPart) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setLocations((list) => list.map((row) => (row.id === id ? { ...row, [part]: value } : row)))
    edited(locationKey(id, part))
  }

  function addLocation() {
    const id = `${baseId}-row-${String(nextRow.current)}`
    nextRow.current += 1
    // A row the visitor just asked for is not a mistake yet: stop flagging every
    // blank on the form, but keep the lines already on screen.
    if (tried) {
      setTouched((t) => new Set([...t, ...issues.keys()]))
      setTried(false)
    }
    focusNext.current = domId(locationKey(id, 'address'))
    setLocations((list) => (list.length >= MAX_LOCATIONS ? list : [...list, emptyLocation(id)]))
  }

  // The removal waits for the row to collapse, so it reads the list then, not now.
  function removeLocation(id: string) {
    // Two quick deletes must not empty the list: one location always stays.
    if (locations.length - rowsLeaving() <= 1) return
    leaveRow(id, () => {
      setLocations((list) => list.filter((row) => row.id !== id))
    })
  }

  async function submit() {
    if (busy) return
    setFailure(null)
    const first = firstProblem(issues)
    if (first !== undefined) {
      setTried(true)
      focusField(first)
      return
    }

    const sentRowIds = locations.map((row) => row.id)
    // The thanks names what was sent, not what the fields hold when the answer comes back.
    const report = reportFrom({ ...person, locations })
    const controller = new AbortController()
    inFlight.current = controller
    setBusy(true)
    try {
      await api.leads.requestHotlineReport(report, { signal: controller.signal })
      onSent({ email: report.email, count: report.locations.length })
    } catch (e) {
      if (isCanceled(e)) return
      const refusals = refusedProblems(e, sentRowIds, presentRowIds.current)
      const firstRefused = firstProblem(refusals)
      if (firstRefused === undefined) {
        setFailure(sendErrorFrom(e))
      } else {
        setRefused(refusals)
        setTouched((t) => new Set([...t, ...refusals.keys()]))
        focusField(firstRefused)
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null
      setBusy(false)
    }
  }

  const personInput = (field: PersonField) => ({
    id: domId(field),
    value: person[field],
    onChange: setPersonField(field),
    onBlur: touch(field),
    error: shown(field),
  })

  return (
    <form
      noValidate
      className="@container/hotline-form flex flex-col gap-[18px]"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div className={`${PAIR} grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
        <Input label="Họ và tên" placeholder="Nguyễn Minh Anh" autoComplete="name" {...personInput('contact_name')} />
        <Input
          label="Email công việc"
          placeholder="ten@phongkham.vn"
          type="email"
          inputMode="email"
          autoComplete="email"
          {...personInput('email')}
        />
      </div>

      <Input
        label="Tên phòng khám hoặc chuỗi phòng khám"
        placeholder="Nha khoa Minh Anh"
        autoComplete="organization"
        {...personInput('clinic_name')}
      />

      <div className="mt-1.5 flex flex-col gap-3.5 border-t border-border-hairline pt-[22px]">
        {/* The list's action in the list's head, pinned right at every width (docs/ui-ux-principles.md §2). */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <span className="inline-flex items-center gap-2.5 font-display text-[20px] leading-[1.3] font-semibold text-text-heading">
            Các cơ sở
            <span className="box-border inline-grid h-6 min-w-6 place-items-center rounded-pill bg-surface-card px-[7px] font-num text-[12.5px] font-semibold tabular-nums text-text-muted">
              {locations.length}
            </span>
          </span>
          {locations.length < MAX_LOCATIONS ? <AddButton label="Thêm cơ sở" onClick={addLocation} /> : null}
        </div>

        <div ref={rowsRef} className="flex flex-col gap-3">
          {locations.map((row, i) => (
            <LocationEntry
              key={row.id}
              row={row}
              ordinal={i + 1}
              canRemove={locations.length > 1}
              onRemove={() => {
                removeLocation(row.id)
              }}
              field={(part) => ({
                id: domId(locationKey(row.id, part)),
                value: row[part],
                onChange: setLocationField(row.id, part),
                onBlur: touch(locationKey(row.id, part)),
                error: shown(locationKey(row.id, part)),
              })}
            />
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex flex-col gap-3">
        <Button type="submit" size="lg" fullWidth disabled={busy}>
          {busy ? 'Đang gửi…' : 'Nhận báo cáo miễn phí'}
        </Button>
        {/* Inline, not a toast: someone who just typed their details needs the answer to stay on screen. */}
        {failure === null ? null : (
          <p role="alert" className="m-0 text-ui leading-(--leading-body) text-error">
            {failure}
          </p>
        )}
        <p className="m-0 flex items-start gap-2 text-ui leading-[1.5] text-text-muted">
          <Icon name="privacy" size={15} className="mt-px" />
          Thông tin chỉ dùng để gọi thử và gửi báo cáo cho bạn. Cuộc gọi thử không đặt lịch thật.
        </p>
      </div>
    </form>
  )
}

interface FieldProps {
  id: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  error: string | undefined
}

interface LocationEntryProps {
  row: LocationRow
  ordinal: number
  canRemove: boolean
  onRemove: () => void
  field: (part: LocationPart) => FieldProps
}

/** One location: its ordinal and delete, then the address beside the number patients call. */
function LocationEntry({ row, ordinal, canRemove, onRemove, field }: LocationEntryProps) {
  return (
    <div {...appearRow(row.id)} className="rounded-md px-4 pt-3 pb-[18px] shadow-[inset_0_0_0_1px_var(--border-hairline)]">
      <div className="mb-1.5 flex min-h-[34px] items-center justify-between gap-3">
        <span className="inline-flex items-center gap-[7px] text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-muted uppercase">
          <Icon name="location" size={15} />
          Cơ sở {ordinal}
        </span>
        {canRemove ? <IconButton name="trash" label={`Xoá cơ sở ${String(ordinal)}`} danger onClick={onRemove} /> : null}
      </div>

      <div className={`${PAIR} grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`}>
        <Input
          label="Địa chỉ"
          placeholder="12 Nguyễn Trãi, Quận 1, TP.HCM"
          // Off, so the browser does not offer the visitor's home address for a clinic.
          autoComplete="off"
          {...field('address')}
        />
        <Input
          label="Số hotline"
          placeholder="028 3822 1234"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          numeric
          {...field('phone')}
        />
      </div>
    </div>
  )
}
