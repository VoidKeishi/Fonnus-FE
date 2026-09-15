/**
 * One error type for everything the API can do wrong, and one function that
 * turns it into a Vietnamese sentence.
 *
 * The frontend owns every string a clinic owner reads. The server sends machine
 * codes; the copy lives here, next to the rest of the product's voice. A
 * server-authored sentence would not match the screen around it.
 */

export type ApiErrorKind =
  /** fetch rejected — offline, DNS, connection refused. */
  | 'network'
  /** Our own timeout fired. */
  | 'timeout'
  /** The caller aborted: unmount, navigation, a newer request. Usually not shown. */
  | 'canceled'
  | 'unauthorized'
  | 'forbidden'
  | 'notfound'
  /** 409 — someone else wrote this record first. */
  | 'conflict'
  /** 422, or a 400 carrying a field list. */
  | 'validation'
  | 'ratelimited'
  | 'server'
  /** 2xx, but the body was not what we expected. */
  | 'parse'
  | 'unknown'

export interface FieldError {
  /** Dotted path into the record, array indices included: `service_catalog.3.price_from`. */
  field: string
  /** Machine code. Never rendered — map it to Vietnamese here. */
  code: string
  /** The server's English text, for logs only. */
  detail?: string
}

export interface ApiErrorInit {
  kind: ApiErrorKind
  status?: number | null
  code?: string | null
  fields?: readonly FieldError[]
  requestId?: string | null
  cause?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  /** Machine code from the body, e.g. `otp_expired`. */
  readonly code: string | null
  /** Empty unless `kind === 'validation'`. */
  readonly fields: readonly FieldError[]
  /** From `x-request-id` — the thing worth pasting into a bug report. */
  readonly requestId: string | null
  /** Whether trying the same thing again could plausibly work. */
  readonly retryable: boolean

  constructor(init: ApiErrorInit) {
    super(`${init.kind}${init.status === undefined ? '' : ` (${String(init.status)})`}${init.code ? `: ${init.code}` : ''}`)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status ?? null
    this.code = init.code ?? null
    this.fields = init.fields ?? []
    this.requestId = init.requestId ?? null
    this.retryable =
      init.kind === 'network' ||
      init.kind === 'timeout' ||
      init.kind === 'server' ||
      init.kind === 'ratelimited'
    if (init.cause !== undefined) this.cause = init.cause
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

/**
 * True for an abort the caller asked for. Check this before setting any error
 * state: an unmounted component reporting "network failed" is a lie, and under
 * React StrictMode's double-invoked effects it happens on every mount in dev.
 */
export function isCanceled(e: unknown): boolean {
  if (isApiError(e)) return e.kind === 'canceled'
  return e instanceof DOMException && e.name === 'AbortError'
}

/** Maps an HTTP status to a kind. Exported for the mocks, which fake statuses. */
export function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notfound'
  if (status === 409) return 'conflict'
  if (status === 422 || status === 400) return 'validation'
  if (status === 429) return 'ratelimited'
  if (status >= 500) return 'server'
  return 'unknown'
}

/*
 * Vietnamese copy. Keyed on the server's machine code first, then on the kind.
 *
 * Tone note: the rest of the product says "giúp mình" and "ạ" — these are the
 * same voice, not system messages bolted on.
 */

const BY_CODE: Record<string, string> = {
  otp_invalid: 'Mã không đúng. Bạn kiểm tra lại giúp mình nhé.',
  otp_expired: 'Mã đã hết hạn. Bấm gửi lại để nhận mã mới.',
  otp_too_many: 'Bạn thử quá nhiều lần rồi. Đợi vài phút rồi thử lại giúp mình.',
  otp_rate_limited: 'Bạn vừa yêu cầu mã xong. Đợi một chút rồi thử lại nhé.',
  invalid_phone: 'Số điện thoại chưa đúng. Bạn kiểm tra lại giúp mình nhé.',
  invalid_email: 'Email chưa đúng. Bạn kiểm tra lại giúp mình nhé.',
  file_too_large: 'Tệp quá lớn. Mỗi tệp tối đa 20 MB.',
  unsupported_file_type: 'Định dạng tệp này chưa được hỗ trợ.',
}

const BY_KIND: Record<ApiErrorKind, string> = {
  network: 'Không kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại giúp mình nhé.',
  timeout: 'Máy chủ phản hồi chậm. Bạn thử lại giúp mình nhé.',
  canceled: 'Đã huỷ.',
  unauthorized: 'Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại giúp mình nhé.',
  forbidden: 'Tài khoản này không có quyền thực hiện thao tác đó.',
  notfound: 'Không tìm thấy thông tin này.',
  conflict: 'Thông tin này vừa được sửa ở nơi khác. Bạn tải lại trang rồi lưu lại giúp mình nhé.',
  validation: 'Có mục chưa hợp lệ. Bạn xem lại các ô được đánh dấu giúp mình nhé.',
  ratelimited: 'Bạn thao tác hơi nhanh. Đợi một chút rồi thử lại nhé.',
  server: 'Máy chủ đang gặp sự cố. Bọn mình đang xử lý — bạn thử lại sau ít phút nhé.',
  parse: 'Máy chủ trả về dữ liệu không đọc được. Bọn mình đã ghi nhận.',
  unknown: 'Có lỗi xảy ra. Bạn thử lại giúp mình nhé.',
}

/** The Vietnamese sentence to show for any thrown value. Safe on non-Errors. */
export function messageFor(e: unknown): string {
  if (!isApiError(e)) return BY_KIND.unknown
  // Read once into a local: `noUncheckedIndexedAccess` types a lookup in a
  // string-keyed record as possibly undefined, and a second lookup would not
  // be narrowed by a check on the first.
  if (e.code !== null) {
    const byCode = BY_CODE[e.code]
    if (byCode !== undefined) return byCode
  }
  return BY_KIND[e.kind]
}
