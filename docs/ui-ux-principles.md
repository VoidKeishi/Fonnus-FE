# UI/UX principles

The rules that keep every Fonnus app screen feeling like the same product. They are
written from mistakes that were actually made here — each one existed as an
inconsistency on a real page before it became a rule.

**This is a living document.** At the end of a session that changed a screen, come back
and ask: did I invent a shape that is not in here? Did I have to fix the same thing
twice? If so, add the rule and say which page taught it. A rule with no page behind it
is a guess, and guesses do not belong in this file.

Related, and not repeated here:

- `../CLAUDE.md` — the repo's non-negotiables (few dependencies, snake_case model,
  Vietnamese copy, load-bearing CSS).
- `./visual-language.md` — colour, icons, shapes, patterns, `--icon-accent`.
- `../../Fonnus-Web-UI/design-reference/Fonnus Visual Language.dc.html` — the drawn
  catalogue, left in the prototype repo as an archive.

The audience for every screen under `/app` is one person: the owner of a Vietnamese
clinic, on their own, usually in a hurry, often on a phone. They are not exploring the
product. They are answering questions so the receptionist can do her job. Everything
below follows from that.

---

## 1. One shape per meaning

The fastest way to make a product feel unfinished is to let one visual style mean two
different things. When it does, the owner has to read every instance to find out which
one it is, and the style has stopped carrying information.

**The dashed rounded rectangle means "content, not yet filled in".** Exactly two things
wear it:

| Dashed thing | What it says |
| --- | --- |
| `EmptyState` | this list is empty, and here is what goes in it |
| `Suggestion` | here is a ready-made line — press it and it becomes yours |

Nothing else. In particular it is **not** an add button. It used to be, on five
different pages, and the result was that half the dashed boxes on a screen were things
you read and half were things you pressed to make an empty row.

**Blush (`--surface-warm`) means speech** — the assistant's panel, and the
receptionist's own line inside a call preview. Never a callout, never a badge inside a
form.

**Status is a fact about the clinic, never an obligation.** A row says what is currently
set — `2 số · Linh gọi chị Lan trước` — and a row with nothing in it says what she
cannot do without it, in her words, and wears the dashed edge. There is no "bắt buộc"
chip to reach for: `GateTag`, the `gate` prop on `Card` and on every field, and the
`.gateR1`/`.gateR2`/`.gateO`/`.gateSW` classes were deleted once the last three screens
stopped using them. The catalogue's R1/R2 gates still exist where they belong — in
`readiness.ts`, which decides what the product chases the owner about — not as a chip
sitting beside a field the owner is already looking at.

> **Check:** in one card, is anything dashed except an empty state or a suggestion? If
> yes, one of them is wearing the wrong clothes.

---

## 2. The action to add lives in the head of the card it adds to

Top right, in `Card`'s `actions` slot, as an `AddButton`. Never at the foot of the list.

Three reasons, in order of how much they matter:

1. **It does not move.** A foot button sits directly under the last row, so it is in a
   different place on every card and moves down the page every time the owner uses it.
   In the head it is where it was the first time, and where it is on every other card.
2. **It reads as the card's action, not as a row.** At the foot of a list, a full-width
   add button is the same width and shape as the rows above it — it looks like an empty
   record, which is what made it dashed in the first place (see §1).
3. **It survives a long list.** Ten holidays push a foot button below the fold; the head
   is always one scroll from the card's title.

This matches how Polaris treats a list's primary action: an empty state does not need
its own button when the section header already carries the call to action, sitting a
few dozen pixels above it.

`Card`'s head is a two-column grid — title and subtitle take what is left, the action is
pinned right at every width. It used to be a wrapping flex row, which put the action
inline on a desktop and *below the subtitle* in the narrower column beside the try-out
rail. That is the one place the reader most needs to know where the action lives.

A group band inside a card (the price list's headings) uses the same pair with
`band` — same pill, one step smaller, so a band still reads as a band.

**Deleting** is `DeleteButton` when there is room for the word, and
`IconButton name="trash" danger` inside a row or an entry head where there is not.

> **Check:** every list on a page — does its add button sit in a card head, right-aligned,
> reading `+ Thêm <the thing>`?

---

## 3. A repeated record is an entry inside one card, never a card of its own

A list of doctors, branches, questions or holidays is **one `Card`** containing
`styles.entries` → `styles.entry` blocks. Each entry opens with `entryHead`: an ordinal
label in micro caps (`BÁC SĨ 1`, `CHI NHÁNH 2`) and its own delete on the right.

A stack of top-level cards, one per record, loses the two things that make a list a
list: there is nowhere to put the count, and nowhere to put the add button, so it ends
up loose at the bottom of the page belonging to nothing.

The price list is the same idea one level deeper — rows that expand to edit, under
renamable group bands — because it is long enough to need scanning rather than reading.

**The choice between the two is about what a closed record can say.** If a record has a
one-line summary worth scanning, it is a row (`ExpandRow`); if every field matters and
there is nothing to scan, it is an entry. A doctor is a row, because "bác sĩ Hùng hôm nay
có làm không" is answered by the closed line; a question is a row, because the question
and the first words of its answer are the whole record; a branch and a holiday are
entries, because an address has nothing to summarise.

**And there is a third answer: neither.** A record of two short fields, in a list the
owner fills in one sitting, is a **table row that edits in place** — no press to open, no
summary, because there is nothing a summary could hide. `Từ hay nghe nhầm` was built as
an expanding row and it was wrong: a price row has eight fields worth folding away, a
keyterm has two, and thirty of them meant thirty extra presses to do one job. The test is
not "how many fields" but **how many of these will they fill in a row**. One record at a
time → expand. Thirty in a sitting → a table.

The row's geometry lives in `app/ui/Rows.tsx` — `RowList`, `ExpandRow`, `RowText`,
`RowValue`, `RowMeta`, `RowEdit` — not on the page that wrote it first. Four pages
hand-assembling the same spans is four pages that drift; and the container query the
row answers to (`rows`) has to be declared and queried in one stylesheet, because a
CSS-module container name is global while its classes are not.

A row's columns are fixed so every value in a list lands on one vertical, which means a
value that is a **set of marks rather than text** — a doctor's week — must be
`RowValue fixed`. Text that runs out ends in an ellipsis and loses a letter; a set of
marks loses its last day, silently, and the row then says something untrue.

**Two cards that end in the same sentence are one card.** `Chuyển máy` asked "when may
she agree to fetch a person" and "which number does she ring" on two cards, and both
ended in the same `Said` line, because they are two settings of one decision. Printing
the sentence twice said the page had nothing to add the second time. They are now one
card: the tiles, then the numbered list under a `Rule` band, then one line. The card
that stayed separate — "when does she hand over *without being asked*" — earned it by
saying something different, because there she is offering rather than agreeing.

> **Check:** does the page have more than one card with the same title shape
> (`Câu hỏi 1`, `Câu hỏi 2`)? Then it wants to be one card of entries — or, if the first
> line of each would be worth scanning, one card of rows. And read the `Said` lines
> down the page: if two are the same sentence, the two cards are one question.

---

## 4. An empty list still has to teach

An empty state is the first thing a new owner reads on most of these pages, so it is
onboarding, not an error message. It is always two parts:

- **What it is** — `Chưa có gói combo`, not `Không có dữ liệu`.
- **What it buys them, with an example, in the receptionist's own terms** —
  *"Gộp vài dịch vụ thành một giá — VD: cạo vôi và tẩy trắng 2 triệu. Khách hỏi 'có
  combo không', Linh có gói để đọc."*

The second half is the whole point. `Chưa có gói combo` alone hands the work back to the
reader: they now have to guess what a combo is, whether they want one, and what it
changes about the call. Naming the caller's question — *khách hỏi…* — answers all three
in one sentence.

Every list gets one, including the ones that are usually full. `Bảng giá` shipped
without an empty state because it always arrives seeded from the dental template; the
one owner who cleared it saw a blank card that looked broken.

> **Check:** empty each list on the page in your head. Does each one still say what the
> thing is and what it changes about a call?

---

## 5. Suggestions live in the card they write into

A suggestion is a ready-made line the owner adopts by pressing it. It belongs **inside
the card holding the box or list it writes into**, below a hairline labelled `GỢI Ý` —
never in a card of its own.

A separate suggestions card asks the reader to carry the link between two sections
themselves, and it puts the examples furthest away at the one moment they are worth
most: when the box above is still blank. `Chỉ dẫn riêng` and `Câu hỏi thường gặp` both
had this, and both now read as one thing.

Use `Suggestions` + `Suggestion` from `app/ui`. Whole sentences are rows; short values
are dashed pills (`styles.suggest` — the shape `Dịch vụ không làm` uses), never
`ChipButton`s, which mean *a value that is on or off* rather than *a value you can take*.

**Three at a time, and the rest behind `SuggestionMore`.** Seven dashed rows on
`Câu hỏi` were taller than the list they wrote into, so the card read as a page of
examples with a list attached; three say what a good one looks like, which is all the
examples were ever for. The reveal is a ghost pill, not a dashed row — dashed is content
(§1), and this is a control.

---

## 6. A list moves the same way everywhere

A row never appears under the cursor and never blinks out. It grows into its place over
200ms on `--ease-arc`, and the rows below slide down with it; deleting runs the same
200ms backwards. One idiom for every list — a combo, a doctor, a holiday, a price row,
an escalation number — via `useAppear` in `app/ui`.

```tsx
const rows = useAppear(draft.branch_list.map((b) => b.id))
// …
<div ref={rows.ref(b.id)} className={styles.entry}>
  <IconButton name="trash" onClick={() => rows.leave(b.id, () => set('branch_list', (l) => l.filter((x) => x.id !== b.id)))} />
```

Three things about it are decisions, not incidental:

- **It animates the row itself, not a wrapper.** A wrapper animating `0fr` → `1fr` is
  the usual way to reach a natural height without measuring it, and it is what the
  holiday list used to do — but the price list draws the rule between two rows with
  `.svc + .svc::before`, and a div between them puts a hairline under every open,
  unfilled and dragging row in three lists. Measuring costs one layout read and leaves
  the markup alone, so it is the one that generalises. **Any motion added to a list has
  to survive that constraint.**
- **Everything that makes the row tall collapses with it** — padding, borders, and the
  parent's `row-gap`. Height alone leaves an `.entry` sitting at 30px of padding at the
  shut end, and leaves the gap to close in one frame at the very end: the jump the
  animation existed to remove, moved to the last frame.
- **An exit defers the data change, so the removal must read the draft, not close over
  it.** `set` and `patch` take an updater for exactly this. Two deletes inside the same
  200ms both close over the same array otherwise, and the second one puts the first row
  back — which is a data-loss bug, not a visual one.

Anything waiting on an animation needs a timer floor as well as the event.
`finish` never fires while the document timeline is stopped — a hidden tab, a throttled
window — and then an entrance leaves the row clipped (eating the focus ring off the
pills inside) and an exit leaves the delete unapplied. Events are the fast path; the
timer is the floor.

> **Check:** add a row, then delete two rows a frame apart. The count must fall by two.

---

## 7. Show, do not explain

The owner is answering questions, not reading a manual. Prose is the most expensive way
to say anything on these screens, so it is the last thing to reach for.

- A drawn state beats a sentence: the open/closed dot on `Giờ mở cửa`, the terracotta
  dot on a partial-closure pill, a dashed edge on a row that is missing the thing that
  makes it useful.
- **Every card ends in the sentence the receptionist would actually say**, built from
  the current draft (`Said`, `Linh đọc:`). One rendered sentence answers "what does this
  field do" better than a paragraph of hint text, and it updates as they type.
- **When the field is empty, `Said` shows the line she falls back to** — not nothing.
  "Dạ, câu này em xin ghi nhận và nhờ nhân viên gọi lại anh chị ạ." is the entire
  argument for filling the field in, and it makes the argument in her voice instead of
  in a warning. The fallbacks live on the `Exchange` in `answers.ts` beside the answers,
  so the form and the receptionist say the same words; `BHYT` reads as four answers
  being written rather than as four fields being filled because of it.
- **A closed set of options that are each a *thing* is a grid of drawn tiles**, not a
  list of radios: a payment method, a kind of insurance. The drawing is read before the
  label is, and the grid answers in one glance instead of one line at a time
  (`TileGrid` / `Tile`, `single` for a one-of choice). It is the wrong reach when the
  set is open-ended — that is a `ChipInput` — or when the labels are sentences.
- **Let the owner hear it when hearing is the point.** `Từ hay nghe nhầm` is the page
  an owner understands least, because "phonetic hint" is an abstraction. A play button
  beside the spelling, reading the word back *inside a sentence*, is the whole
  explanation: type, listen, fix, listen. The same button does the same job for
  `Cách đọc tên` on `Địa điểm`.
- **One worked example, not one per row.** Thirty identical placeholders down a column
  teach nothing the first one did not and turn the empty half of a table into noise. Put
  the example on the first row still missing a value; the column heading does the rest.
- **A default state is said, not drawn.** A weekday a doctor keeps the clinic's own hours
  on reads "Theo giờ phòng khám" in quiet text; only the exceptions wear pills. A pill
  for the default would claim the owner had set something, and five identical pills is
  five things to check that nobody chose.
- **A page whose output is not speech still ends in what it produces.** `Gửi email`
  makes an email, so the card shows the email — addressed, with its subject, filled in
  with one worked call, and the parts that change from call to call tinted. That tint is
  the entire explanation of what a variable is; the row of «tên_khách» chips it replaced
  asked an owner to learn a token vocabulary in order to read their own mail. Same test
  as `Said`: show the thing that actually leaves the building, not the template that
  makes it.
- **And write it for them.** The same page used to hand a clinic owner three subject
  lines and three bodies to compose, with tokens inserted at the caret. That is a
  copywriting job given to somebody who wanted a notification. Fonnus owns the wording —
  the frontend owns all Vietnamese copy anyway — the owner picks who receives it, and
  `Sửa lời` is one press away for the few who want their own.
- Every screen ends in something you can hear — the try-out rail. Nothing on these pages
  is theoretical.
- A hint under a field earns its place only if it says something the field cannot show.
  If it restates the label, delete it.
- Do not repeat the page's lede in a card subtitle. If the card needs the same sentence
  the page already gave, the card does not need a sentence.

---

## 8. The same page at three widths

Every screen has to work on a desktop, on a tablet, and on a phone the owner is holding
while a patient waits. The layout may change; **the rules above may not**. The add
button is top right at 1440px and at 375px.

The frame is the same everywhere: back link and title → one-line lede → work column
beside the try-out rail. The rail is separated by the **gutter** — 380px column, 40px
gap, a hairline down the middle of it — not by a fill.

**It is one file.** `SectionFrame` / `Section.module.css` holds the frame and the hub
row; `KnowledgeSection`, `ProfileSection` and `SkillsSection` are three lines each,
differing only in which hub the back link points at. Hồ sơ wrote the geometry and Kiến
thức restated it — 180 byte-identical lines across two stylesheets, each carrying a
comment saying "change them together" — and the third tab is what finally moved it. A
tab that needs the frame does not restate it.

**A tab without a hub is a tab you cannot stand back from.** Kỹ năng had a 220px list of
skills down the left of its own pages instead, and that cost it all three of the things
above: no way back, no lede, and no try-out rail — on the three screens about what she is
*allowed to do*, which is the part an owner most wants to hear before trusting it.

Traps that have each cost a session:

- A two-column grid that collapses to `flex-direction: column` **must** restate
  `align-items: stretch`. `align-items: start` is a grid instruction; left on a flex
  column it sizes every child to its own max-content, which blew a 375px page 620px wide.
- `overflow-x: clip`, never `hidden` — `hidden` makes an ancestor the scroll container
  and silently kills `position: sticky`.
- `scrollbar-gutter: stable` on `html`, or the centred column shifts 7–8px between a
  page that fits the viewport and one that does not.
- Never add `container-type` to `.card`. It implies `contain: layout`, which makes the
  card a containing block for fixed positioning and would break every anchored pop-up
  inside it. Measure with `useElementWidth`, or query a container on an inner list
  (`.services`, `.holidays`), as those two already do.
- **A control that can stand in a card *or* nest inside a row's editor carries its own
  container.** The week (`Week.module.css`) queried `rows` while it lived only inside a
  doctor's open row; standing in a card on `Đặt lịch` there is no `rows` container above
  it, and the phone layout would simply never have fired. It declares `week` on its own
  list instead, and both callers get the same breakpoint.
- **The page module must not be imported by what the pages import.** `SectionHead` lived
  in `LeTanPage.tsx`, which imports every section, so a frame importing it closed the
  loop — and the bundler reports that as `does not provide an export named
  'ProfileSection'`, a message naming the wrong module entirely. The head moved into `SectionFrame`, beside
  the frame that uses it.
- The bottom edge is one sticky stack anchored by the save bar. Anything else wanting
  that edge goes through `BottomStackProvider`. Never a hard-coded offset, and never
  measure the bar — its height changes as its message wraps.

> **Check:** at 375px — does the page scroll sideways? Is any action off the card? Both
> are measurable; `document.documentElement.scrollWidth > innerWidth` answers the first.

---

## 9. Copy

All of it Vietnamese, all of it owned by the frontend. Code, comments and this document
are English.

- Say what the caller asks, not what the field stores. `khách gọi nhầm nơi, Linh đọc địa
  chỉ và số của chi nhánh đúng` — not `Danh sách chi nhánh`.
- Name the receptionist. `Linh báo…`, `Linh đọc…`. She is the reason any of this is
  being filled in, and the sentence stops being abstract the moment she is in it.
- A card subtitle is a phrase in sentence case, not a heading. It sits beside the title
  on a wide screen and wraps under it on a narrow one, so it has to read either way.
- No English leaks — including error text and anything a server sends back. The API
  returns machine codes; this app maps them.

---

## Verifying a change

The pane's screenshots are unreliable on these pages, so do not let a picture be the
only evidence. Measure:

```js
// in the browser console — every card's action, at the current width
[...document.querySelectorAll('section')]
  .filter(s => s.querySelector(':scope > div > div > h3'))
  .map(card => {
    const head = card.querySelector(':scope > div')
    const acts = head.children[1]
    const cr = card.getBoundingClientRect()
    const r = acts && acts.getBoundingClientRect()
    return {
      title: head.querySelector('h3').textContent.trim(),
      action: acts && acts.textContent.trim(),
      gapFromCardRight: r && Math.round(cr.right - r.right), // want: the card's padding
      overflows: r && (r.right > cr.right + 1 || r.left < cr.left - 1), // want: false
    }
  })
```

**A row that has just appeared measures 0 in the pane.** `useAppear` animates height, and
the Browser pane stops the document timeline whenever it is not painting — so the
animation sits at `currentTime: 0` for ever and every new row reports `height: 0`. The
tell is `document.timeline.currentTime` not advancing across an `await`. Finish them
before measuring:

```js
;[...list.children].forEach((r) => r.getAnimations().forEach((a) => a.finish()))
```

Then the repo's own gate: `pnpm typecheck` and `pnpm lint` clean, and the demo login still
works (`0914378064` / `111002`).

---

## Lessons log

Newest first. One line per session that taught something; the rule itself goes above.

- **2026-09-06 (fourth round — the dead kit)** — Rebuilding Kỹ năng retired the last
  users of four pieces of `app/ui`, and a repo-wide grep found nothing else reaching for
  any of them, so they went: `GateTag` + the `Gate` type + the `gate` prop threaded
  through `Card`, `FieldFrame`, `TextField`, `TextArea`, `SelectField`, `NumberField`,
  `MoneyRangeField`, `DateField`, `DateRangeField` and `TimeField`; `SpeechBubble`;
  `Notice`; and `EmptyState`'s `action` slot, which let an add button appear inside an
  empty state and then jump to the card head once a row existed (§2 — it must not move).
  About 300 lines. Two things worth knowing before deleting anything similar: every
  place in the app that draws speech owns its own bubble — the landing page's
  `CallDemoPlayer`, `SetupChat`, `AuthPanel` — so nothing depended on the kit's, and
  `PlayButton` sits *inside* `SpeechBubble` in the file while being used by five other
  screens, so the cut has to be made between them. The `ticks` pattern is now drawn by
  nothing; it stays in the catalogue, marked unused, the way `rings` already was. → §1.

- **2026-09-06 (third round — Kỹ năng)** — Rebuilt `Chuyển máy`, `Gửi email` and
  `Đặt lịch hẹn`, the last three pages still speaking the old vocabulary: `gate=` and
  `SpeechBubble` appeared in exactly these three files and nowhere else in the repo, and
  a `Notice tone="warm"` was doing callout duty inside a form — the one thing §1 forbids
  blush from being. The tab had no hub, so its pages had no way back, no lede and **no
  try-out rail**, on the three screens about what she is allowed to do. Giving it one
  forced three things into the open: the section frame, which had been living as two
  byte-identical copies (now `SectionFrame` / `Section.module.css`); the
  week-and-time-blocks control `Bác sĩ` wrote, which `Đặt lịch` needed for exactly the
  same question and which retired the last native `<input type="time">` in the app (now
  `../Week`); and the fact that a control moving between a card and a row's editor has to
  carry its own container query. Two rules that were genuinely new: two cards ending in
  the same `Said` are one card, and a page whose output is an email ends in the
  **email** — filled in with a worked call, its variable parts tinted — rather than in a
  template and a legend. And one decision that was about the product rather than the
  layout: an owner who wanted a notification should not be handed three email templates
  to write. → §3, §7, §8.

- **2026-09-06 (second round, on the owner's feedback)** — Three things the first pass
  got wrong. A doctor's hours were one free-text line, which cannot say "15:00–17:00 and
  20:00–22:00 on Monday, 09:00–10:00 on Tuesday": now a block list per weekday
  (`[ext] working_shifts`), where a ticked day with no block *inherits the clinic's
  hours* and says so — so a normal roster still costs no typing, and the catalogue's
  `working_hours_note` is written from the blocks the way `promo_description` is written
  from a promotion's services. `Từ hay nghe nhầm` went back from expanding rows to a
  table that edits in place, and the words derived from the other pages joined it instead
  of sitting in a read-only panel nobody could act on — with the rule that **nothing the
  owner cannot reach from somewhere in the product belongs on their screen**, which took
  the industry pack off the page entirely. And a select's list scrolled by fourteen
  pixels because `OPTION_HEIGHT` under-counted by half a pixel per row: the fix was to
  measure, not to restyle the scrollbar. → §3, §7.
- **2026-09-06** — Redesigned `BHYT`, `Bác sĩ`, `Câu hỏi` and `Từ khoá` together, which
  is why so much of what they needed turned out to be shared. `Dịch vụ` had privately
  owned three ideas the other pages wanted: the `Said` line, the row that reads closed
  and opens to edit, and the drawn tile grid. All three moved to `app/ui`
  (`Rows.tsx`/`Rows.module.css`, `Tiles.tsx`), and `Dịch vụ` and `Giờ mở cửa` now import
  what they wrote. Two things fell out of the move: a CSS-module `container-name` is
  **not** scoped (classes are), so the container and its queries must share a file or
  they silently detach; and a `RowValue` holding marks rather than text has to refuse to
  shrink, or the phone quietly clipped a doctor's Sunday. The rules that were genuinely
  new: a `Said` on an empty field shows the **fallback she actually says**, which argues
  for filling the field better than any warning; a closed set of options that are each a
  thing is a tile grid; and the page whose subject is *sound* (`Từ khoá`) is explained
  by a play button, not by a sentence about phonetics. → §3, §5, §7.

- **2026-09-05** — The holiday list was the only one whose new rows grew into place;
  every other list popped. Generalised it as `useAppear` and put it on all nine lists,
  with the matching exit. Two things fell out that were bugs rather than polish: an
  animation's `finish` never fires while the document timeline is stopped, so a delete
  waiting on it could be swallowed; and deferring a removal by 200ms meant two quick
  deletes each closed over the same array, so the second restored the first row —
  `set`/`patch` now take an updater. → §6.
- **2026-09-05** — Add buttons at the foot of a list (`Ngày nghỉ`, `Chi nhánh khác`,
  `Từ khoá`, `Bác sĩ`, `Câu hỏi`) contradicted `Gói combo`'s head button, and wore the
  dashed style that elsewhere means "content". Moved every one into its card head as a
  shared `AddButton`; made `Card`'s head a grid so the action stays pinned right in the
  narrow column beside the rail; split the dashed style into `EmptyState` /
  `Suggestion`; rebuilt `Bác sĩ` and `Câu hỏi` as entries in one card; merged both
  suggestion cards into the card they write into; gave `Bảng giá` the empty state it
  never had. → §1, §2, §3, §4, §5.
