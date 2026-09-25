# Visual language — "Cung và chấm"

How Fonnus draws things. The source is the design handoff
`../../Fonnus-Web-UI/design-reference/Fonnus Visual Language.dc.html` (section "6 · Hình hoạ" of the
identity deck); this page is the English working copy plus the decisions made
when it was implemented. The code is the source of truth for what ships:

| What                | Where                                                     |
| ------------------- | --------------------------------------------------------- |
| Icons (glyph data)  | `src/design-system/icons.ts`                              |
| Icon renderer       | `src/design-system/icon.tsx`                              |
| Shapes              | `src/design-system/shape.tsx`                             |
| Patterns            | `src/design-system/pattern.tsx`                           |
| The accent colour   | `--icon-accent` in `src/styles/tokens/colors.css`         |

Everything is built from the two shapes in the logo: **a rising arc** and **a
solid ink dot**. No stock icon set, no free-hand drawing — every curve is an arc
of a circle on the 24 grid.

## The four rules

1. **One accent.** Each icon has exactly one terracotta part — the arc, the dot
   or the stroke that carries the meaning. Everything else is ink.
2. **Arcs, not corners.** Every curve is an arc of radius 2 / 4 / 6.4 / 8.7.
   Round caps, round joins.
3. **Stroke 2, body 3.** Standard stroke is 2 on the 24 grid. Only the handset
   and the report bars go to 2.6–3 so they read at 16 px.
4. **Open, not closed.** No double outlines, no fills (except the dot), no
   shadows. Drawings are as airy as the layout.

## Construction

- Grid 24 × 24, safe area 20 × 20.
- Keyline circle r 8.7 — the proportion of the ink dot in the logo.
- **Stroke compensates for size; the shape never changes.** At 16 px the stroke
  is 2.2 and the dot 0.2 bigger; 20–24 px is 2; from 32 px up it thins to 1.8.
  `Icon` does this automatically from `size`.
- **Night surfaces.** Ink becomes cream (`--cream-night`) and the accent becomes
  `--terracotta-night`. The shape is unchanged. In code this is `currentColor`
  plus `--icon-accent`, which every night surface sets (save bar, footer,
  enterprise band, the sign-up panel).
- **Terracotta surfaces.** An accent would vanish into a terracotta ground, so
  every rule that paints `--action-primary` / `--terracotta` under cream text
  also sets `--icon-accent: currentColor` — the icon collapses to one colour.

## Icons

Every icon ships with a text label; a glyph never carries meaning on its own.
One icon per row in a list — never two.

### The reference set

| Name          | Vietnamese     | Accent                       | Used for                                    |
| ------------- | -------------- | ---------------------------- | ------------------------------------------- |
| `answered`    | Nghe máy       | voice arc                    | a call taken; "Cuộc gọi" nav; "Nghe thử"    |
| `incoming`    | Gọi đến        | inbound arrow                | call log rows; "Số điện thoại" nav          |
| `missed`      | Bỏ lỡ          | cross                        | the missed call in "Vì sao"                 |
| `voice`       | Giọng nói      | cradle arc                   | recording consent; the mic in the call demo |
| `assistant`   | Trợ lý         | arc                          | the Fonnus assistant                        |
| `appointment` | Cái hẹn        | tick                         | bookings; "Lịch hẹn" nav                    |
| `hours`       | Giờ mở cửa     | hands                        | opening hours                               |
| `always-on`   | 24/7           | the uncovered arc            | 24/7 coverage                               |
| `price`       | Giá            | coin                         | price lists, plans                          |
| `handoff`     | Chuyển bác sĩ  | arrow                        | transfer to a person; "Chuyển máy" skill    |
| `caller`      | Khách gọi      | head                         | the caller; "Lễ tân" nav                    |
| `message`     | Tin nhắn       | middle dot                   | messages                                    |
| `settings`    | Cài đặt        | middle slider                | settings; step 1 of "Cách hoạt động"        |
| `search`      | Tìm            | handle                       | search                                      |
| `location`    | Cơ sở          | pin point                    | address                                     |
| `time-saved`  | Thời gian      | the grain                    | hours returned                              |
| `privacy`     | Dữ liệu        | shackle                      | data, consent, the legal line               |
| `report`      | Báo cáo        | tallest bar                  | reports                                     |
| `after-hours` | Buổi tối       | star                         | evening, after hours                        |
| `done`        | Đã xong        | tick                         | resolved; the sent state                    |

### Micro glyphs (ink only)

`check` `x` `chevron-down` `chevron-up` `chevron-left` `chevron-right` `plus`
`minus` `arrow-right` `arrow-up` `menu` `play` `pause`, and `dot` (the ink dot,
accent by definition). They replace ✓ ✕ ▾ + → · in tables, lists and controls —
stroke 2.2, round caps, no accent. The FAQ's `plus` rotates 45° to become the
close cross; one glyph, two states.

### Extensions `[ext]`

The reference draws twenty icons; the product needs about twice that. These are
drawn in the same grammar for concepts the set does not cover. Treat them as
proposals a designer may redraw, not as canon — each is marked `[ext]` in
`icons.ts`.

| Name           | Replaces (Lucide)          | Drawing                                            |
| -------------- | -------------------------- | -------------------------------------------------- |
| `overview`     | `house`                    | four rounded tiles, one terracotta                 |
| `calendar`     | `calendar-days`            | the calendar frame with two day-dots               |
| `document`     | `file-text`                | a page, terracotta text lines                      |
| `sheet`        | `receipt`                  | a sheet of rows, terracotta column rule            |
| `image`        | —                          | a frame, terracotta sun over a hill                |
| `guide`        | `book-open`                | an open book of two arcs, terracotta spine         |
| `instructions` | `clipboard-list`           | a clipboard, terracotta list lines                 |
| `list`         | `list-checks`              | three rows, the first ticked in terracotta         |
| `mail`         | `mail`                     | an envelope whose flap is two arcs                 |
| `volume`       | `volume-2`, `ear`          | the dot with two arcs leaving it                   |
| `voice-off`    | `mic-off`                  | the microphone crossed in terracotta               |
| `globe`        | `globe`                    | the ring with a meridian arc                       |
| `sun`          | `sun`                      | a terracotta disc with short rays                  |
| `sunset`       | `sunset`                   | a half-set sun, the arc terracotta                 |
| `caller-lost`  | `user-round-x`             | the handoff composition with a terracotta cross in place of the arrow |
| `practitioner` | `stethoscope`              | a person with a terracotta badge — the reference forbids the stethoscope |
| `alert`        | `circle-alert`, `triangle-alert` | the ring, terracotta stem, ink dot           |
| `info`         | `info`                     | the ring, ink dot, terracotta stem                 |
| `help`         | `circle-help`              | the ring, terracotta question hook                 |
| `cash`         | `banknote`                 | a banknote, terracotta coin in the middle          |
| `transfer`     | `arrow-left-right`         | two opposed arrows, the outbound one terracotta    |
| `card`         | `credit-card`              | a card, terracotta stripe                          |
| `insurance`    | `shield-plus`, `heart-pulse` | the same card, its stripe replaced by a terracotta cross and one ink name line — a BHYT card, not a shield |
| `wallet`       | `wallet`                   | a wallet, terracotta clasp pocket                  |
| `trash`        | `trash-2`                  | a bin, terracotta handle arc                       |
| `edit`         | `pencil`                   | a pencil, terracotta tip                           |
| `sign-out`     | `log-out`                  | a door edge, terracotta arrow leaving              |
| `grip`         | `grip-vertical`            | six dots, one terracotta — a row that can be dragged |

Lucide is gone from the codebase (`lucide-static` removed, `public/icons/`
deleted). Do not bring a stock set back for a one-off — draw the icon here and
mark it `[ext]`.

### Using `Icon`

```tsx
<Icon name="appointment" size={20} />           // ink = currentColor, accent = --icon-accent
<Icon name="done" size={28} accent="var(--success)" />
```

`size` sets the stroke compensation; `color` overrides ink; `accent` overrides the
one accent for a single glyph. Prefer setting `--icon-accent` on the surface over
passing `accent`.

## Shapes

Six pictograms for slides, the landing page and the app — the same grid blown up
eight times (200 × 200). `<Shape name="…" size={…} />`.

| Name               | Vietnamese                 | Meaning                                                         | On the site                                     |
| ------------------ | -------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| `always-on`        | Nghe máy 24/7              | a closed ring; the terracotta arc covers the hours no one is on | "Vì sao" answer band; "Cuộc gọi" placeholder    |
| `rising-arcs`      | Cuộc gọi được trả lời      | three arcs rising from one point — the motion idiom             | "Vì sao" heading; "Tổng quan" placeholder       |
| `handoff`          | Chuyển cho bác sĩ          | two points, one arc; the destination is sage                    | the ringed card in "Bảo mật"                    |
| `relieved-owner`   | Chủ phòng khám nhẹ người   | the person below, the call held above; no face                  | "Phòng khám đang dùng" heading                  |
| `clear-price`      | Giá rõ ràng                | the number is the picture; tabular figures, terracotta rule     | not placed yet — tried in the "Bảng giá" head and removed as unclear next to real prices |
| `appointment-grid` | Giữ cái hẹn                | one cell filled — the step under way; unreached steps dashed    | "Lịch hẹn" placeholder                          |

A shape sits beside a heading or above a card title, never as decoration
floating in space. Below 900 px the heading shapes are hidden rather than
squeezed.

## Patterns

Five repeating tiles plus the divider band. `<Pattern name="…" />` fills its
positioned parent; give the parent `position: relative; isolation: isolate;
overflow: hidden` and pass `style={{ zIndex: -1 }}` (or use `Card`'s `pattern`
prop, which does this for you).

| Name         | Vietnamese     | Tile      | Ground        | Where                                              |
| ------------ | -------------- | --------- | ------------- | -------------------------------------------------- |
| `rings`      | Vòng reo       | 40 × 20   | paper         | opening slides (unused on the site so far)         |
| `dots`       | Chấm nhịp      | 22 (+110) | paper         | the hero and the call overlay, radially masked behind the orb, hidden below 900px |
| `arcs`       | Cung chéo      | 26        | blush / terracotta | the Bảo mật section (masked under the cards); the featured plan card in cream; the sign-in panel; the assistant panel's header strip at ~8% |
| `grid`       | Lưới lịch      | 28        | paper / milk  | hours and holidays cards (`Card pattern="grid"`); every `EmptyState` |
| `ticks`      | Dấu thanh      | 24, −12°  | sage only     | nothing at present — it belonged to `Notice tone="sage"` and the handoff bubble, both retired with the gate chips (Sept 2026). Sage only, when a resolved state next needs one |
| `band`       | Dải phân cách  | 120 × 60  | blush         | the divider band before "Bảng giá" (`Band.tsx`)    |
| `night-dots` | Chấm nhịp, tối | 22        | night         | save bar, footer, enterprise band, sign-up panel   |

Rules:

- **Never above 12%** (the band goes to 22%, and never under the copy at that
  strength — `Band.module.css` masks it towards the text column).
- **One kind of pattern per ground.** The reference says one kind per page, written
  for slides. On a long scrolling page it is read as one pattern per ground colour:
  paper takes the dots, blush the arcs (or the band), milk the grid, night the
  dots only. Any one screenful still shows one pattern, and the pattern says
  which surface you are on.
- **Night takes the dots only.** Arcs read too loud on brown.

## Do / Don't

**Do**

- One terracotta accent per drawing — not two.
- Every icon with a label; the drawing does not carry meaning alone.
- Patterns ≤ 22%, one kind per page.
- Scale by keeping the shape and changing the stroke.

**Don't**

- Sound waves, medical stethoscopes, chat bubbles with tails, sparkles, robots,
  crosses.
- Filled icons, double-outline icons, gradients or shadows on icons.
- Mixing Lucide or any stock set into this one.
- Illustrations with faces, emotions or characters.
