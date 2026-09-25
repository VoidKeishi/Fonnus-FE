/**
 * The plans and the comparison table the landing page's "Bảng giá" shows,
 * copied from ../Fonnus-Web-UI/src/data/pricing.ts. Prices are display strings,
 * already written the Vietnamese way (`2.500.000`); nothing computes with them.
 */
export type PlanName = 'Dùng thử' | 'Cơ bản' | 'Tiêu chuẩn' | 'Nâng cao'

export interface Plan {
  name: PlanName
  blurb: string
  /** Undefined for the free trial, which shows a word instead of a number. */
  price?: { monthly: string; annual: string }
  /** Caption under the price, one per billing period. */
  note?: { monthly: string; annual: string }
  /** Shown instead of a price on the free plan. */
  freeLabel?: string
  freeNote?: string
  features: string[]
  cta: string
  /** The one filled terracotta card — "the step that is live now". */
  featured?: boolean
  badge?: string
}

export const PLANS: Plan[] = [
  {
    name: 'Dùng thử',
    blurb: 'Nghe thử trên số thật, 14 ngày',
    freeLabel: 'Miễn phí',
    freeNote: 'không cần thẻ, dừng khi hết phút',
    features: ['100 phút dùng thử', '1 số máy', '1 cuộc gọi cùng lúc', '1 giọng nói'],
    cta: 'Dùng thử',
  },
  {
    name: 'Cơ bản',
    blurb: 'Một phòng khám, một số máy chính',
    price: { monthly: '2.500.000', annual: '2.125.000' },
    note: {
      monthly: 'hoặc trả năm 2.125.000 đ/tháng',
      annual: 'thanh toán một lần 25.500.000 đ',
    },
    features: [
      '1.000 phút mỗi tháng',
      'Vượt gói 3.000 đ/phút',
      '2 số máy · 2 cuộc gọi cùng lúc',
      'Sổ lịch và kho kiến thức tự học',
    ],
    cta: 'Chọn Cơ bản',
  },
  {
    name: 'Tiêu chuẩn',
    blurb: 'Phòng khám 1–2 cơ sở',
    price: { monthly: '4.900.000', annual: '4.165.000' },
    note: {
      monthly: 'hoặc trả năm 4.165.000 đ/tháng',
      annual: 'thanh toán một lần 49.980.000 đ',
    },
    features: [
      '2.500 phút mỗi tháng',
      'Vượt gói 2.500 đ/phút',
      '5 số máy · 10 cuộc gọi cùng lúc',
      'Giọng nói riêng',
      'Kết nối lịch',
    ],
    cta: 'Chọn Tiêu chuẩn',
    featured: true,
    badge: 'Phổ biến nhất',
  },
  {
    name: 'Nâng cao',
    blurb: 'Nhiều cơ sở, nhiều máy cùng đổ chuông',
    price: { monthly: '9.900.000', annual: '8.415.000' },
    note: {
      monthly: 'hoặc trả năm 8.415.000 đ/tháng',
      annual: 'thanh toán một lần 100.980.000 đ',
    },
    features: [
      '6.000 phút mỗi tháng',
      'Vượt gói 2.200 đ/phút',
      '10 số máy · 25 cuộc gọi cùng lúc',
      'Quản lý tài khoản riêng',
    ],
    cta: 'Chọn Nâng cao',
  },
]

export type MatrixRow =
  | { kind: 'group'; label: string }
  | { kind: 'row'; label: string; cells: [string, string, string, string] }

export const COMPARISON_MATRIX: MatrixRow[] = [
  { kind: 'group', label: 'Sử dụng' },
  { kind: 'row', label: 'Số phút bao gồm', cells: ['100', '1.000', '2.500', '6.000'] },
  { kind: 'row', label: 'Giá thực tế mỗi phút', cells: ['—', '2.500 đ', '1.960 đ', '1.650 đ'] },
  { kind: 'row', label: 'Giá vượt phút', cells: ['Dừng', '3.000 đ', '2.500 đ', '2.200 đ'] },
  { kind: 'row', label: 'Cuộc gọi cùng lúc', cells: ['1', '2', '10', '25'] },
  { kind: 'row', label: 'Số máy bao gồm', cells: ['1', '2', '5', '10'] },
  { kind: 'row', label: 'Thêm số máy, mỗi tháng', cells: ['—', '500.000 đ', '500.000 đ', '500.000 đ'] },
  { kind: 'group', label: 'Trợ lý' },
  { kind: 'row', label: 'Kho giọng nói', cells: ['1', '50+', '50+', '50+'] },
  { kind: 'row', label: 'Giọng nói riêng', cells: ['✕', '✕', '✓', '✓'] },
  { kind: 'group', label: 'Kỹ năng và cấu hình' },
  { kind: 'row', label: 'Cấu hình lời dẫn của trợ lý', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Chuyển cuộc gọi cho nhân viên', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Từ điển thuật ngữ riêng', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Điều chỉnh tốc độ nói', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Điều chỉnh độ nhạy', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Điều chỉnh phong cách trả lời', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Âm nền cuộc gọi', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Sổ lịch trống', cells: ['✕', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Kho kiến thức tự học', cells: ['✕', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Tra cứu Internet', cells: ['✕', '✓', '✓', '✓'] },
  { kind: 'group', label: 'Nền tảng' },
  { kind: 'row', label: 'Ghi âm cuộc gọi', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Bảng điều khiển', cells: ['✓', '✓', '✓', '✓'] },
  { kind: 'row', label: 'Kết nối lịch', cells: ['✕', '✓', '✓', '✓'] },
  { kind: 'group', label: 'Vận hành và hỗ trợ' },
  { kind: 'row', label: 'Onboarding Academy (video)', cells: ['✓', '✓', '✓', '✓'] },
  {
    kind: 'row',
    label: 'Guided Setup, một lần',
    cells: ['—', '2.000.000 đ', '2.000.000 đ', '2.000.000 đ'],
  },
  { kind: 'row', label: 'Quản lý tài khoản riêng', cells: ['✕', '✕', '✕', '✓'] },
]

/** Under both comparison tables — the landing page's and Gói dịch vụ's. */
export const MATRIX_FOOTNOTE =
  'Cổng đồng ý, câu công bố trợ lý AI và việc chuyển cho người thật có ở mọi gói, kể cả Dùng thử. Trả tháng và trả năm khác nhau ở giá, không khác ở tính năng.'
