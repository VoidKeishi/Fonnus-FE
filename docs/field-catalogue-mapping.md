# Field catalogue ↔ frontend model

How `src/features/receptionist/model.ts` relates to the Fonnus context field catalogue, which field
names differ, and what to do when the two disagree.

Read this before changing either side.

**`src/features/receptionist/` does not exist yet in this repo.** The Lễ tân configuration screens, and the
model this document maps, arrive with roadmap step F3 in `PLAN.md`; the mapping was written
against the prototype `../Fonnus-Web-UI` and is carried here so the field names are settled
before the screens are rebuilt.

---

## The rule of authority

Two documents, two jobs. Neither is a superset of the other.

| | Normative for |
|---|---|
| **The catalogue** (backend repo, `docs/context-field-catalogue.md`) | Field **names**, **types**, **origin** (TE/SW/SD) and **gate** (R1/R2/O). If the catalogue says `pricing_disclosure_policy`, the frontend does not get to call it `priceMode`. |
| **`src/features/receptionist/model.ts`** | What the **UI lets a tenant edit**, and how it is grouped into screens. The catalogue does not know about tabs, sections, or save boundaries. |

Consequences, stated once so nobody has to re-derive them:

- **The frontend model is snake_case on purpose.** It is not a style choice and it is not an
  oversight. It mirrors the catalogue 1:1 so a section save maps straight onto the tenant
  record with no translation layer. Do not "fix" it to camelCase.
- **A field the catalogue does not define does not go in `model.ts` without an `[ext]` mark.**
  See the `[ext]` table below.
- **When they disagree on a name, the catalogue wins** and the frontend renames. The exceptions
  are listed under *Known divergences* and each one has a reason.

A frozen copy of catalogue v1 sits beside this file as
[`context-field-catalogue.v1.md`](./context-field-catalogue.v1.md), so this mapping can be
verified without checking out the backend repo. Update both in the same commit, or neither.

---

## Where each part of the catalogue lives

| Catalogue origin | Lives in | Rendered as |
|---|---|---|
| **TE** — tenant-entered | `src/features/receptionist/model.ts` → `ReceptionistConfig` | An editable field in a section form |
| **SW** — system-written by Fonnus | `src/features/receptionist/system.ts` | Read-only, with a "Hệ thống" tag |
| **SD** — system-derived at runtime | Computed, or absent — see *Derived fields* | Not editable anywhere |

---

## Section A — general fields

Legend: ✅ present and named identically · ⚠️ present but differs (see notes) · ➖ deliberately absent

### A1 · Business identity and location

| Catalogue | Model | |
|---|---|---|
| `business_name` | `business_name` | ✅ |
| `business_name_spoken` | `business_name_spoken` | ✅ |
| `industry_vertical` | `industry_vertical` | ✅ union of 7 verticals |
| `city` | `city` | ✅ |
| `address_full` | `address_full` | ✅ |
| `location_landmarks` | `location_landmarks` | ✅ |
| `directions_note` | `directions_note` | ✅ |
| `parking_info` | `parking_info` | ✅ |
| `digital_links` | `digital_links` | ✅ |
| `vat_invoice_policy` | `vat_invoice_policy` | ⚠️ modelled as `{ option, note }`; the catalogue says "dropdown + note" without naming the two parts |
| `branch_list` | `branch_list: Branch[]` | ✅ name, address, phone — `branch_hours_note` dropped from the catalogue Sept 2026 |

### A2 · Hours and open-state

| Catalogue | Model | |
|---|---|---|
| `operating_hours_by_weekday` | `operating_hours_by_weekday: DayHours[]` | ✅ |
| `break_periods` | `break_periods: BreakPeriod[]` | ⚠️ model adds `days: Weekday[]` (empty = every open day). The catalogue gives no columns |
| `is_open_now` | — | ➖ **SD.** Computed client-side by `readiness.ts → isOpenNow()`. See *Derived fields* |
| `current_datetime_local` | — | ➖ **SD.** Per-call runtime injection; no UI |
| `holiday_exceptions` | `holiday_exceptions: HolidayException[]` | ⚠️ the catalogue's `date_range` is split into `date_from` / `date_to`. Model adds `seeded` `[ext]` |

### A3 · Services and pricing

| Catalogue | Model | |
|---|---|---|
| `service_catalog` | `service_catalog: ServiceRow[]` | ⚠️ all eight columns ✅; model adds `id`, `from_template` and `service_group` `[ext]` |
| — | `service_groups: string[]` | `[ext]` the price list's headings, in order — see the `[ext]` table |
| `pricing_disclosure_policy` | `pricing_disclosure_policy` | ✅ `'exact' \| 'range' \| 'defer'` |
| `services_not_offered` | `services_not_offered` | ✅ |
| `package_bundles` | `package_bundles: Bundle[]` | ⚠️ catalogue says "table" with no columns; model defines `{ bundle_name, price, service_ids, note }` — `service_ids` `[ext]` points at `service_catalog` rows by `id`, so it depends on Q5 (stable ids) |
| `instalment_options` | `instalment_options` | ✅ |
| `payment_methods` | `payment_methods` | ✅ `cash \| transfer \| card \| momo \| zalopay` |
| — | `payment_methods_other: string[]` | `[ext]` free-text methods the enum does not name — see the `[ext]` table |
| `active_promotions` | `active_promotions: Promotion[]` | ⚠️ model adds `promo_services` (service id + percent) and `promo_condition` `[ext]`; `promo_description` is now **derived** from them by the UI, never typed |

### A4 · Scheduling and booking

| Catalogue | Model | |
|---|---|---|
| `ai_bookable_slots_per_day` | `ai_bookable_slots_per_day` | ✅ |
| `slot_duration` | `slot_duration` | ✅ minutes |
| `slot_rules` | `slot_rules: SlotRule[]` | ⚠️ modelled per weekday with `windows[]`; catalogue gives no columns |
| `buffer_time` | `buffer_time` | ✅ minutes |
| `max_bookings_per_day` | `max_bookings_per_day` | ✅ nullable |
| `availability_slots` | — | ➖ **SD.** The live booking ledger. Backend-owned; the config UI never reads or writes it |
| `booking_confirmation_channel` | `booking_confirmation_channel` | ✅ |
| `deposit_policy` | `deposit_policy` | ✅ |
| `cancellation_policy` | `cancellation_policy` | ✅ |
| `no_show_policy` | `no_show_policy` | ✅ |
| `identity_verification_rule` | `identity_verification_rule` | ✅ tighten-only, as the catalogue requires |

### A5 · Escalation and human availability

| Catalogue | Model | |
|---|---|---|
| `escalation_targets` | `escalation_targets: EscalationTarget[]` | ✅ |
| `after_hours_routine_behavior` | `after_hours_routine_behavior` | ✅ |
| `callback_policy` | `callback_policy` | ✅ |
| `waiting_time_expectation` | `waiting_time_expectation` | ✅ |
| `escalation_triggers` | `system.ts → ESCALATION_TRIGGERS_BASE` **+** `escalation_triggers_custom` | ⚠️ **split.** See *Split fields* |
| — | `escalation_window` | `[ext]` |

### A6 · Voice and persona

| Catalogue | Model | |
|---|---|---|
| `voice_selection` | `voice_selection` | ⚠️ modelled as four named voices (`linh`/`mai`/`khang`/`duc`) = gender × accent. Picking one also sets `voice_accent` |
| `voice_accent` | `voice_accent` | ✅ `nam` / `bac` |
| `speaking_speed` | `speaking_speed` | ✅ |
| `personality_style` | `personality_style` | ✅ |
| `greeting_compliance_block` | `system.ts → GREETING_COMPLIANCE_BLOCK` | ⚠️ **merged.** One constant covers this *and* A9's `ai_disclosure_script` + `consent_notice_script` |
| `greeting_script_custom` | `greeting_script_custom` | ✅ |
| `verbosity_cap` | `system.ts → VERBOSITY_CAP_SENTENCES` | ✅ SW |
| `secondary_language` | `secondary_language` | ✅ |
| — | `greeting_by_daypart` | `[ext]` |
| — | `agent_name` | `[ext]` |

### A7 · Speech recognition and turn-taking

Every field maps ✅ and identically: `endpointing_silence_ms`, `silence_nudge_enabled`,
`silence_nudge_delay_seconds`, `silence_nudge_script`, `end_call_after_silence_enabled`,
`end_call_after_n_nudges`, `call_closing_script`. `max_call_duration_seconds` is SW, in
`system.ts`.

`keyterms: Keyterm[]` ✅ with all three columns. The vertical pack rows come from
`system.ts → KEYTERMS_PACK`; derived rows are computed client-side (see *Derived fields*).

### A8 · Knowledge and behaviour steering

`tenant_instructions` ✅ · `knowledge_files` ✅ · `website_scrape_url` ✅ · `faq_pairs` ✅

`knowledge_files` and `website_scrape_url` have no form of their own: the owner hands a
file or a URL to the Fonnus assistant, which reads it and proposes values for the
Kiến thức sections. The model keeps both fields so the record still mirrors the catalogue.

### A9 · Compliance and safety

All SW, all in `system.ts`, none editable:

| Catalogue | `system.ts` |
|---|---|
| `ai_disclosure_script` | folded into `GREETING_COMPLIANCE_BLOCK` ⚠️ |
| `consent_notice_script` | folded into `GREETING_COMPLIANCE_BLOCK` ⚠️ |
| `recording_retention` | `RECORDING_RETENTION_DAYS` |
| `pdpl_data_minimisation_rule` | `PDPL_DATA_MINIMISATION` |
| `unresolvable_fallback_script` | `UNRESOLVABLE_FALLBACK_SCRIPT` |

One extra constant, `PRICE_QUALIFIER`, has no catalogue entry — it is the sentence appended
to every price voiced under the `range` disclosure policy. The catalogue mentions
`price_qualifier_script` only in passing, as an example of a Section B field. Worth
catalogue-ising properly.

---

## Section B — clinic pack

| Catalogue | Model | |
|---|---|---|
| `insurance_bhyt_policy` | `insurance_bhyt_policy` | ⚠️ `{ option, note }`, as A1's VAT policy |
| `consultation_fee` | `consultation_fee` | ✅ nullable; `0` means free |
| `facility_capabilities` | `facility_capabilities` | ✅ |
| `pre_appointment_instructions` | `pre_appointment_instructions` | ✅ |
| `practitioner_roster` | `practitioner_roster: Practitioner[]` | ⚠️ all nine columns ✅; model adds `id`, `practitioner_gender` and `working_shifts` `[ext]`. `working_hours_note` is now **derived** from `working_shifts` by the UI, never typed |
| `after_hours_emergency_target` | `after_hours_emergency_target` | ⚠️ `{ phone, name }`; the catalogue types it as a phone |
| `emergency_red_flags` | `system.ts → EMERGENCY_RED_FLAGS_PACK` **+** `emergency_red_flags_custom` | ⚠️ **split** |
| `emergency_instruction_script` | `system.ts → EMERGENCY_INSTRUCTION_SCRIPT` | ✅ SW |
| `medical_advice_refusal_script` | `system.ts → MEDICAL_ADVICE_REFUSAL_SCRIPT` | ✅ SW |
| `symptom_capture_rule` | `system.ts → SYMPTOM_CAPTURE_RULE` | ✅ SW |

---

## Split "SW base + tenant additions" fields

The catalogue models two fields as a single name with origin *"SW (TE additions O)"*:
`escalation_triggers` and `emergency_red_flags`. The tenant may add rows but never remove a
system row.

The frontend enforces that structurally rather than by convention — the system rows live in
`system.ts` where no form can reach them, and the tenant's additions live in a separate
`*_custom` array:

| Catalogue field | System half | Tenant half |
|---|---|---|
| `escalation_triggers` | `ESCALATION_TRIGGERS_BASE` | `escalation_triggers_custom: string[]` |
| `emergency_red_flags` | `EMERGENCY_RED_FLAGS_PACK` | `emergency_red_flags_custom: string[]` |

**The effective value the pipeline should use is the concatenation**, system rows first.

> **Backend question.** Does the tenant record store one merged array or two columns? Two
> columns is safer: it makes "the tenant cannot remove a system row" a schema property rather
> than something every writer has to remember, and it lets Fonnus update the pack without
> touching tenant data. Recommendation: two columns, merged at prompt-assembly time.

---

## Derived fields the frontend currently computes

Three catalogue-SD values are computed in the browser today. Each is a drift risk: the
pipeline needs the same answer, and two implementations in two languages will not agree
forever.

| Catalogue | Computed by | Note |
|---|---|---|
| `is_open_now` | `readiness.ts → isOpenNow()` | From hours, breaks and holidays, for the live "đang mở cửa" indicator |
| `keyterms` (derived rows) | `KeytermsSection.tsx → derivedKeyterms()` | From `business_name` + service names + aliases + practitioner names, per the catalogue's A7 note. The **word** is derived; its `phonetic_hint` is not — writing one materialises a stored row with `source: 'derived'`, so a re-derivation must merge on `term` rather than replace the list |
| R1 / R2 readiness gates | `readiness.ts → computeReadiness()` | Not a catalogue field, but it applies the catalogue's gates — and the pipeline needs the same verdict to decide whether an agent may go live |

> **Backend question.** Should these come down in `GET /tenant/config` instead? The frontend
> still needs `is_open_now` locally for an indicator that updates without a request, but the
> *authoritative* answer — the one that gates booking, and the one that decides go-live —
> should have exactly one implementation. See [`open-questions.md`](./open-questions.md) Q7.

---

## `[ext]` — fields the UI added on top of the catalogue

Everything below is a frontend invention. It is marked `[ext]` in `model.ts` and is **safe to
drop or fold into an existing column server-side** — but the backend must decide which,
because six of the fifteen built sections write at least one of them.

| `[ext]` field | What it is | Why it exists | Suggested resolution |
|---|---|---|---|
| `agent_name` | The receptionist's given name ("Linh") | Used in every self-introduction and throughout the UI copy. The catalogue has a voice but no name | **Store it.** Tenant-visible product identity, not UI state |
| `assigned_phone` | The Fonnus number this receptionist answers on | Chosen from the FPT inventory pool during setup. Owned by the "Số điện thoại" tab; Lễ tân only reads it | **Store it**, but owned by number provisioning. Likely read-only here |
| `operating_hours_confirmed` | Has the tenant looked at the pre-filled weekly hours? | The template is pre-filled, so "not empty" cannot prove the tenant agreed with it, and R1 needs an affirmative confirm | **Store it.** Without it, R1 passes on data nobody checked |
| `holidays_confirmed` | Same, for the pre-seeded Tết dates | The catalogue itself says Tết is "the field that breaks agents" | **Store it**, same reasoning |
| `escalation_window` | When the agent may attempt a transfer at all (`always` / `business_hours` / `after_hours`) | Wireframe 20. The catalogue has escalation targets and triggers but no time bound | Store, or fold into `after_hours_routine_behavior` |
| `greeting_by_daypart` | Optional per-daypart greetings (`{ enabled, morning, afternoon, evening }`) | Wireframe 16. An extension of `greeting_script_custom` | Store as JSONB, or drop and keep one greeting |
| `email_rules: EmailRule[]` | Per-intent email notification rules, with recipients and templates | The whole Kỹ năng → "Gửi email" skill. **Not in catalogue v1 at all** | **Needs a decision.** This is a feature, not a field — it implies an outbound email service |
| `ServiceRow.from_template` | Did this row come from the vertical template? | Lets the UI tag a row "mẫu" so the tenant knows what still needs checking | Store, or re-derive server-side when seeding |
| `ServiceRow.service_group` | The price-list heading a service sits under ("Tổng quát", "Thẩm mỹ"), free text the owner renames | Every Vietnamese clinic's bảng giá is grouped, and a clinic with 30 rows cannot scan a flat list. The agent never voices the heading | Store as a column on the row |
| `service_groups: string[]` | The headings themselves, in display order | A heading has to be able to stand **empty** — the owner names a group before filling it, and dragging the last row out must not delete it. A list derived from the rows cannot represent that. The UI reads the union (list first, then any name still on a row) so the two halves cannot drift apart and no row can be hidden | Store as an ordered array on the tenant, or a small `service_groups` table with a position column |
| `Promotion.promo_services` | `{ service_id, discount_percent }[]` — which services an offer discounts, and by how much | "Giảm 20% tẩy trắng" is structured data the agent has to apply per service; as prose it could not be checked against the price list or expired per row | Store as a join table keyed on the service id (depends on Q5, stable ids) |
| `payment_methods_other` | Ways to pay the five-value enum does not name | Vietnamese clinics take wallets and bank apps the enum was fixed before; an owner who cannot enter theirs simply leaves the field wrong | Store as a string array beside the enum, or widen the enum and keep this for the tail |
| `Promotion.promo_condition` | "Áp dụng khách mới" — what a caller must satisfy | The catalogue has only `promo_description`, which is now the *derived* sentence | Store as a column |
| `Practitioner.practitioner_gender` | `nam` / `nu`, empty until answered | "Có bác sĩ nữ không?" is a weekly call at a Vietnamese clinic and the roster had no way to answer it. Empty is a third state on purpose — an unanswered gender must not be read as "nam" | Store as a column, nullable |
| `Practitioner.working_shifts` | `{ day, from, to }[]` — the blocks of time a practitioner is at the clinic, per weekday | A doctor is in 15:00–17:00 and 20:00–22:00 on Monday and 09:00–10:00 on Tuesday. One free-text line could not carry that, and the agent has to answer "hôm nay bác sĩ Hùng có làm không" with a time. A weekday with **no** block is not a day off — it is a day the practitioner keeps the clinic's own hours, so a normal roster stores nothing and never goes stale when the clinic's hours change | Store as a join table keyed on the practitioner id, or as JSONB on the row |
| `HolidayException.seeded` | Was this row pre-seeded by Fonnus? | Same purpose, for holidays | Same |
| `id` on every entity row | Client-generated row key | React list keys and edit targeting. `model.ts:343` says "the server replaces them on save" | **Decide explicitly** — see open questions Q5 |
| `escalation_triggers_custom`, `emergency_red_flags_custom` | The tenant half of a split field | See *Split fields* above | Two columns recommended |

`Keyterm.source` is **not** an `[ext]` field despite looking like one — the catalogue defines
it as A7 `source [row]`. It is listed here because the UI reads it to decide what a row can
do: a `tenant` row is renamed and deleted in place, a `derived` row shows the word from the
page that owns it and takes only a spelling, and a `pack` row is **not rendered at all** —
Fonnus maintains those words and an owner who cannot reach them from anywhere in the product
should not be shown them. All three are still sent.

---

## Keeping the two from drifting

The catalogue lives in another repo. It will change without this one noticing, and the
failure mode is silent: a renamed field simply stops being saved. Nothing errors.

**The mechanism:** `GET /tenant/config` returns a `catalogue_version` string; `model.ts`
exports a matching `CATALOGUE_VERSION` constant; the config store compares them on load and
logs a loud console warning in development when they differ.

That turns silent drift into noisy drift. It does not prevent drift — nothing can, across two
repos — but it means the next person to open the app finds out in one second rather than after
a tenant's price list quietly stops saving.

Not built yet: it depends on the backend agreeing to return the field. Tracked as Q13 in
[`open-questions.md`](./open-questions.md).
