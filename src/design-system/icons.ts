/*
 * The Fonnus icon set — "Cung và chấm" (arc and dot).
 *
 * Every glyph is built from the two shapes in the logo: a rising arc and a
 * solid ink dot. The rules, from the visual-language reference
 * (`../Fonnus-Web-UI/design-reference/Fonnus Visual Language.dc.html`, documented
 * in `docs/visual-language.md`):
 *
 *   1. One accent.   Exactly one part of each icon is terracotta — the arc,
 *                    the dot or the stroke that carries the meaning. The rest
 *                    is ink. Micro glyphs (check, x, chevrons, plus, arrows)
 *                    are ink only.
 *   2. Arcs, not     Every curve is an arc of a circle of radius 2 / 4 / 6.4
 *      corners.      / 8.7. Round caps, round joins.
 *   3. Stroke 2,     Standard stroke is 2 on the 24 grid. Only the handset
 *      body 3.       and the report bars go to 2.6–3 so they read at 16px.
 *   4. Open, not     No double outlines, no fills (except the dot), no shadows.
 *      closed.
 *
 * Grid 24 × 24, safe area 20 × 20, keyline circle r 8.7 — the proportion of
 * the ink dot in the logo.
 *
 * Icons marked `[ext]` are extensions drawn in the same grammar for concepts
 * the reference set does not cover. They are listed under "Extensions" in
 * `docs/visual-language.md`; treat them as proposals a designer may redraw,
 * not as canon.
 */

/** A stroked path. `w` overrides the stroke width (on the 24 grid). */
interface PathPrim {
  d: string
  accent?: boolean
  w?: number
}

/** A circle. `fill` makes it a solid dot (the logo's ink dot); otherwise it is stroked. */
interface CirclePrim {
  c: [cx: number, cy: number, r: number]
  accent?: boolean
  fill?: boolean
  w?: number
}

/** A rounded rectangle, stroked. Only for the calendar-like glyphs. */
interface RectPrim {
  r: [x: number, y: number, w: number, h: number, rx: number]
  accent?: boolean
  w?: number
}

export type IconPrim = PathPrim | CirclePrim | RectPrim

/* The handset body shared by the three call icons. */
const HANDSET: PathPrim = { d: 'M6 7.5A13 13 0 0 0 16.5 18', w: 3 }
/* The keyline circle shared by the ring icons. */
const RING: CirclePrim = { c: [12, 12, 8.7] }
/* Head and shoulders shared by the person icons. */
const SHOULDERS: PathPrim = { d: 'M5 19.4a7 7 0 0 1 14 0' }
/* The microphone capsule and stem shared by the voice icons. */
const MIC_BODY: PathPrim = { d: 'M12 3.2a2.7 2.7 0 0 1 2.7 2.7v3.8a2.7 2.7 0 0 1-5.4 0V5.9A2.7 2.7 0 0 1 12 3.2z' }
const MIC_STEM: PathPrim = { d: 'M12 17.2v3.2' }
/* The calendar frame shared by the date icons. */
const CALENDAR_FRAME: IconPrim[] = [
  { d: 'M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z' },
  { d: 'M4.5 9.2h15' },
  { d: 'M8.5 2.8v3M15.5 2.8v3' },
]

export const ICONS = {
  /* ------------------------------------------------ The reference set (20) */

  /** Nghe máy — handset with the rising arc of a voice. */
  answered: [HANDSET, { d: 'M13 9A4.5 4.5 0 0 1 22 9', accent: true }],
  /** Gọi đến — handset, arrow coming in. */
  incoming: [HANDSET, { d: 'M21 4.5 15 10.5', accent: true }, { d: 'M15.2 6.6V10.8H19.4', accent: true }],
  /** Bỏ lỡ — handset, the call crossed out. */
  missed: [HANDSET, { d: 'M15.5 5 21 10.5M21 5 15.5 10.5', accent: true }],
  /** Giọng nói — microphone; the cradle arc carries the accent. */
  voice: [MIC_BODY, { d: 'M5.8 11A6.2 6.2 0 0 0 18.2 11', accent: true, w: 2.2 }, MIC_STEM],
  /** Trợ lý — the logo set inside the ring. */
  assistant: [RING, { d: 'M8 11.4A4 4 0 0 1 16 11.4', accent: true }, { c: [12, 15.6, 2.6], fill: true }],
  /** Cái hẹn — calendar with the day ticked. */
  appointment: [...CALENDAR_FRAME, { d: 'M9 13.9l2.3 2.3 4.2-4.7', accent: true }],
  /** Giờ mở cửa — clock; the hands are the accent. */
  hours: [RING, { d: 'M12 7.2V12l3.6 2.2', accent: true }],
  /** 24/7 — a closed ring; the terracotta arc covers the hours no one is on duty. */
  'always-on': [
    { d: 'M12 3.3a8.7 8.7 0 1 1-6.15 2.55' },
    { d: 'M5.85 5.85A8.7 8.7 0 0 1 12 3.3', accent: true, w: 3.4 },
    { c: [12, 12, 2], fill: true },
  ],
  /** Giá — a banknote; the coin is the accent. */
  price: [
    { d: 'M5 7.8h14a1.6 1.6 0 0 1 1.6 1.6v5.2a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6V9.4A1.6 1.6 0 0 1 5 7.8z' },
    { c: [12, 12, 2.6], accent: true },
  ],
  /** Chuyển bác sĩ — a person and the arrow that hands the call on. */
  handoff: [
    { c: [7, 7.6, 2.9] },
    { d: 'M2.6 17.6a4.4 4.4 0 0 1 8.8 0' },
    { d: 'M13.6 12.6h6.8M17.6 9.8l2.8 2.8-2.8 2.8', accent: true },
  ],
  /** Khách gọi — a person; the head is the accent. */
  caller: [{ c: [12, 8.4, 3.4], accent: true }, SHOULDERS],
  /** Tin nhắn — a speech box with three dots, the middle one terracotta. */
  message: [
    { d: 'M4 18.5V6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4z' },
    { c: [9, 10.5, 1.3], fill: true },
    { c: [12.5, 10.5, 1.3], fill: true, accent: true },
    { c: [16, 10.5, 1.3], fill: true },
  ],
  /** Cài đặt — three sliders. */
  settings: [
    { d: 'M4 7.6h16M4 12h16M4 16.4h16' },
    { c: [9, 7.6, 2.2], fill: true },
    { c: [15, 12, 2.2], fill: true, accent: true },
    { c: [7, 16.4, 2.2], fill: true },
  ],
  /** Tìm — a lens; the handle is the accent. */
  search: [{ c: [10.6, 10.6, 6.4] }, { d: 'M15.4 15.4 20 20', accent: true }],
  /** Cơ sở — a map pin; the point is the accent. */
  location: [
    { d: 'M12 20.5c4.4-4.6 6.6-8 6.6-10.6a6.6 6.6 0 1 0-13.2 0c0 2.6 2.2 6 6.6 10.6z' },
    { c: [12, 9.9, 2.4], accent: true },
  ],
  /** Thời gian — an hourglass with a terracotta grain at the neck. */
  'time-saved': [
    { d: 'M7 3.6h10M7 20.4h10' },
    { d: 'M8.4 3.6v3.2L12 11l3.6-4.2V3.6M8.4 20.4v-3.2L12 13l3.6 4.2v3.2' },
    { c: [12, 12, 1.7], fill: true, accent: true },
  ],
  /** Dữ liệu — a padlock; the shackle is the accent. */
  privacy: [
    { d: 'M6.4 10.6h11.2a1.8 1.8 0 0 1 1.8 1.8v6a1.8 1.8 0 0 1-1.8 1.8H6.4a1.8 1.8 0 0 1-1.8-1.8v-6a1.8 1.8 0 0 1 1.8-1.8z' },
    { d: 'M8.6 10.6V8.2a3.4 3.4 0 0 1 6.8 0v2.4', accent: true },
    { c: [12, 15.4, 1.7], fill: true },
  ],
  /** Báo cáo — three bars; the tallest is the accent. */
  report: [{ d: 'M5.5 19V13.4M18.5 19V10.4', w: 2.6 }, { d: 'M12 19V6.6', accent: true, w: 2.6 }],
  /** Buổi tối — a crescent with one terracotta star. */
  'after-hours': [
    { d: 'M19.4 15.2A8.4 8.4 0 0 1 8.8 4.6a8.4 8.4 0 1 0 10.6 10.6z' },
    { c: [16.8, 6.6, 1.7], fill: true, accent: true },
  ],
  /** Đã xong — the ring with a tick. */
  done: [RING, { d: 'M8.2 12.2l2.6 2.6 5-5.6', accent: true }],

  /* ------------------------------------------------ Micro glyphs (ink only) */
  /* Stand in for ✓ ✕ ▾ + → · inside tables and lists. Stroke 2.2, round caps. */

  check: [{ d: 'M4.5 12.6l4.6 4.6L19.5 6.6', w: 2.2 }],
  x: [{ d: 'M6.5 6.5l11 11M17.5 6.5l-11 11', w: 2.2 }],
  'chevron-down': [{ d: 'M6.5 9.8l5.5 5.5 5.5-5.5', w: 2.2 }],
  'chevron-up': [{ d: 'M6.5 14.2l5.5-5.5 5.5 5.5', w: 2.2 }],
  'chevron-right': [{ d: 'M9.8 6.5l5.5 5.5-5.5 5.5', w: 2.2 }],
  'chevron-left': [{ d: 'M14.2 6.5l-5.5 5.5 5.5 5.5', w: 2.2 }],
  plus: [{ d: 'M12 5.2v13.6M5.2 12h13.6', w: 2.2 }],
  minus: [{ d: 'M5.2 12h13.6', w: 2.2 }],
  'arrow-right': [{ d: 'M4.4 12h14.4M13.4 6.6 19 12l-5.6 5.4', w: 2.2 }],
  'arrow-up': [{ d: 'M12 19.6V5.2M6.6 10.6 12 5l5.4 5.6', w: 2.2 }],
  /** The ink dot on its own — a bullet, a "live" mark. Accent by definition. */
  dot: [{ c: [12, 12, 2.6], fill: true, accent: true }],
  menu: [{ d: 'M4 7.2h16M4 12h16M4 16.8h16', w: 2.2 }],
  play: [{ d: 'M8.4 5.8v12.4a1 1 0 0 0 1.5.9l10-6.2a1 1 0 0 0 0-1.8l-10-6.2a1 1 0 0 0-1.5.9z', w: 2.2 }],
  pause: [{ d: 'M8.6 6v12M15.4 6v12', w: 2.6 }],

  /* ------------------------------------------------ Extensions [ext] */

  /** [ext] Tổng quan — four rounded tiles, one terracotta. */
  overview: [
    { r: [4.2, 4.2, 6.8, 6.8, 2] },
    { r: [13, 4.2, 6.8, 6.8, 2], accent: true },
    { r: [4.2, 13, 6.8, 6.8, 2] },
    { r: [13, 13, 6.8, 6.8, 2] },
  ],
  /** [ext] Lịch — the calendar frame with two day-dots, one terracotta. */
  calendar: [...CALENDAR_FRAME, { c: [9.2, 14.2, 1.4], fill: true, accent: true }, { c: [14.8, 14.2, 1.4], fill: true }],
  /** [ext] Tài liệu — a page with a folded corner; the text lines are the accent. */
  document: [
    { d: 'M7 3.5h6.5l4.5 4.5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13.5a2 2 0 0 1 2-2z' },
    { d: 'M13.5 3.5V8h4.5' },
    { d: 'M8.6 12.6h6.8M8.6 16.2h4.4', accent: true },
  ],
  /** [ext] Bảng — a sheet of rows; the column rule is the accent. */
  sheet: [{ r: [4.5, 4.5, 15, 15, 2] }, { d: 'M4.5 10h15M4.5 15h15' }, { d: 'M10 10v9.5', accent: true }],
  /** [ext] Hình ảnh — a frame with a terracotta sun over a hill. */
  image: [
    { r: [4.5, 4.5, 15, 15, 2] },
    { d: 'M4.8 16.2l4-4a1.6 1.6 0 0 1 2.3 0l6.2 6.2' },
    { c: [15.4, 8.8, 1.6], fill: true, accent: true },
  ],
  /** [ext] Hướng dẫn — an open book of two arcs; the spine is the accent. */
  guide: [
    { d: 'M12 6.8A5 5 0 0 0 4.5 5.2v13a5 5 0 0 1 7.5 1.6' },
    { d: 'M12 6.8A5 5 0 0 1 19.5 5.2v13a5 5 0 0 0-7.5 1.6' },
    { d: 'M12 6.8v13', accent: true },
  ],
  /** [ext] Chỉ dẫn — a clipboard; the list lines are the accent. */
  instructions: [
    { r: [5, 5, 14, 16, 2] },
    { d: 'M9 5V4.2a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 4.2V5' },
    { d: 'M8.8 11.2h6.4M8.8 15.2h4', accent: true },
  ],
  /** [ext] Danh sách — three rows; the first is ticked in terracotta. */
  list: [
    { d: 'M9.6 7.2h10M9.6 12h10M9.6 16.8h10' },
    { d: 'M3.6 7.4l1.4 1.4 2.6-2.8', accent: true },
    { c: [5.2, 12, 1.4], fill: true },
    { c: [5.2, 16.8, 1.4], fill: true },
  ],
  /** [ext] Thư — an envelope whose flap is two arcs. */
  mail: [
    { d: 'M5 6.5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2z' },
    { d: 'M3.6 8.6l6.6 5a3 3 0 0 0 3.6 0l6.6-5', accent: true },
  ],
  /** [ext] Âm thanh — the dot with two arcs leaving it. */
  volume: [
    { c: [7, 12, 2.2], fill: true },
    { d: 'M12 8.2a5.4 5.4 0 0 1 0 7.6', accent: true },
    { d: 'M15.4 5.4a9.4 9.4 0 0 1 0 13.2' },
  ],
  /** [ext] Tắt mic — the microphone crossed by a terracotta stroke. */
  'voice-off': [MIC_BODY, { d: 'M5.8 11A6.2 6.2 0 0 0 18.2 11' }, MIC_STEM, { d: 'M4.5 4.5l15 15', accent: true }],
  /** [ext] Toàn cầu — a ring with a meridian arc. */
  globe: [RING, { d: 'M3.3 12h17.4' }, { d: 'M12 3.3a13 13 0 0 0 0 17.4' }, { d: 'M12 3.3a13 13 0 0 1 0 17.4', accent: true }],
  /** [ext] Sáng — a disc with short rays; the disc is the accent. */
  sun: [
    { c: [12, 12, 3.6], accent: true },
    { d: 'M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6' },
  ],
  /** [ext] Chiều — a sun half-set behind the horizon; the arc is the accent. */
  sunset: [
    { d: 'M3.5 17.5h17' },
    { d: 'M7.4 17.5a4.6 4.6 0 0 1 9.2 0', accent: true },
    { d: 'M12 8.6V5.8M5.7 12.5l1.6 1.6M18.3 12.5l-1.6 1.6' },
  ],
  /** [ext] Khách bỏ đi — the handoff composition, but the arrow becomes a cross: the person left, the mark clear of the shoulders. */
  'caller-lost': [
    { c: [7, 7.6, 2.9] },
    { d: 'M2.6 17.6a4.4 4.4 0 0 1 8.8 0' },
    { d: 'M15.4 10.4l4.8 4.8M20.2 10.4l-4.8 4.8', accent: true },
  ],
  /** [ext] Bác sĩ — a person with a terracotta badge at the shoulder. Replaces the stethoscope the reference forbids. */
  practitioner: [{ c: [12, 8.4, 3.4] }, SHOULDERS, { c: [17.2, 14.6, 1.8], fill: true, accent: true }],
  /** [ext] Chú ý — the ring with a terracotta stem and an ink dot. */
  alert: [RING, { d: 'M12 7.4v5.2', accent: true }, { c: [12, 16.2, 1.4], fill: true }],
  /** [ext] Thông tin — the ring with an ink dot and a terracotta stem. */
  info: [RING, { c: [12, 8.2, 1.4], fill: true }, { d: 'M12 11.4v5.2', accent: true }],
  /** [ext] Trợ giúp — the ring with a terracotta question hook. */
  help: [RING, { d: 'M9.4 9.6a2.6 2.6 0 1 1 3.9 2.3c-.8.5-1.3 1-1.3 1.9v.4', accent: true }, { c: [12, 16.8, 1.3], fill: true }],
  /** [ext] Tiền mặt — a banknote, the coin in the middle. */
  cash: [{ r: [3, 6.5, 18, 11, 2.5] }, { c: [12, 12, 2.8], accent: true }],
  /** [ext] Chuyển khoản — money out and money back. */
  transfer: [{ d: 'M4 9.4h13.2' }, { d: 'M14.4 6.6 17.8 9.4 14.4 12.2', accent: true }, { d: 'M20 14.6H6.8' }, { d: 'M9.6 11.8 6.2 14.6 9.6 17.4' }],
  /** [ext] Thẻ — a card and its stripe. */
  card: [{ r: [3, 6, 18, 12, 2.5] }, { d: 'M3 10.4h18', accent: true }],
  /** [ext] Bảo hiểm y tế — the card again, its stripe replaced by the terracotta cross, and one ink line for the name. */
  insurance: [{ r: [3, 6, 18, 12, 2.5] }, { d: 'M6.6 12h3.6M8.4 10.2v3.6', accent: true }, { d: 'M13.4 10.6h4.6M13.4 13.8h3' }],
  /** [ext] Ví điện tử — a wallet, the clasp pocket on the right. */
  wallet: [{ r: [3.5, 6.5, 17, 11, 2.5] }, { d: 'M14.6 10.4h5.9v3.2h-5.9a1.6 1.6 0 0 1 0-3.2z', accent: true }],
  /** [ext] Xoá — a bin; the handle arc is the accent. */
  trash: [
    { d: 'M5 7.2h14' },
    { d: 'M9.4 7.2V5.6a1.6 1.6 0 0 1 1.6-1.6h2a1.6 1.6 0 0 1 1.6 1.6v1.6', accent: true },
    { d: 'M6.6 7.2l.8 11.4a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.8-11.4' },
  ],
  /** [ext] Sửa — a pencil; the tip is the accent. */
  edit: [
    { d: 'M5 19l3.5-.8L18.9 7.8a2.1 2.1 0 0 0-3-3L5.4 15.2z' },
    { d: 'M14.6 6.2l3.2 3.2', accent: true },
  ],
  /** [ext] Kéo thả — a handle of six dots; one is the accent. */
  grip: [
    { c: [9, 6.8, 1.4], fill: true },
    { c: [15, 6.8, 1.4], fill: true },
    { c: [9, 12, 1.4], fill: true, accent: true },
    { c: [15, 12, 1.4], fill: true },
    { c: [9, 17.2, 1.4], fill: true },
    { c: [15, 17.2, 1.4], fill: true },
  ],
  /** [ext] Đăng xuất — a door edge and the arrow leaving it. */
  'sign-out': [
    { d: 'M10 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3' },
    { d: 'M13.6 12h7M17.6 8.8l3.2 3.2-3.2 3.2', accent: true },
  ],
} satisfies Record<string, IconPrim[]>

export type IconName = keyof typeof ICONS

export const ICON_NAMES = Object.keys(ICONS) as IconName[]
