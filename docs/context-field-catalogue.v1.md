> **Frozen copy — do not edit.**
>
> The living document lives in the backend repo as `docs/context-field-catalogue.md`.
> This copy exists so `field-catalogue-mapping.md` has something stable to diff against
> and so a frontend change can be reviewed without checking out the other repo.
>
> - Source: Fonnus backend repo, `docs/context-field-catalogue.md`, v1
> - Copied: 2026-09-03
> - If the original has moved on, update this copy **and** the mapping in the same commit.
>   A silent update to one without the other is exactly the drift this file exists to prevent.

---

# Fonnus Context Field Catalogue – v1

Internal working document. Fresh pass. Restructured into a general core plus a clinic pack.

---

## 0. How to read this document

### Two structural types

Not everything in this catalogue is a single value. There are two kinds of thing:

- **Field** – one value per tenant. `business_name`, `pricing_disclosure_policy`, `endpointing_silence_ms`.
- **Entity (repeating table)** – many rows per tenant, each row with its own columns. `service_catalog`, `practitioner_roster`, `branch_list`. In the UI these are add-a-row tables, not text boxes.

Entities are presented as their own sub-tables. A column inside an entity is marked **[row]** and its gate applies per row, not per tenant. This is what was wrong in v1: `service_catalog` and `price_unit` were listed as two peer fields when `price_unit` is a column inside the `service_catalog` entity. That is fixed here.

### Metadata

- **Origin:** **TE** tenant-entered / **SW** system-written by Fonnus / **SD** system-derived at runtime
- **Gate:**
  - **R1** – required during initial onboarding. The 2-minute path to a working agent. Total R1 tenant effort is budgeted at ~90 seconds.
  - **R2** – required before go-live with real patients, but not in the first 2 minutes. This is the 20-30 minute path.
  - **O** – optional. Improves quality, never blocks.
  - **(auto)** appended to a gate means SW or SD: it is live at that stage but costs the tenant zero seconds.

### Scope

- **Section A – General fields.** Apply to a tenant in any industry. This is the portable core. When Fonnus adds restaurants, hotels, or salons, Section A ships unchanged.
- **Section B – Clinic pack.** Healthcare only. When a new vertical is added, Section B is replaced wholesale by a new pack, not edited.

Runtime per-call data (caller number, live consent state, transcript, call outcome) is out of scope. That is the call-log schema, not tenant configuration.

---

# SECTION A – GENERAL FIELDS

Applies to every tenant regardless of industry.

## A1. Business identity and location

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| business_name | Brand name as written | Nha khoa Việt Smile | TE (text) | **R1** |
| business_name_spoken | Pronunciation override when the written name is voiced badly (foreign words, initialisms) | "Vi-ét Smai" | TE (text, default = business_name) | O |
| industry_vertical | Selects the vertical pack: templates, keyterms, red flags, compliance scripts | Nha khoa | TE (dropdown) | **R1** |
| city | Drives default voice accent and holiday assumptions | TP. Hồ Chí Minh | TE (dropdown) | **R1** |
| address_full | Full address, read out on request | 123 Lê Lợi, P. Bến Nghé, Q.1 | TE (text) | **R1** |
| location_landmarks | Landmark callers navigate by | "Đối diện chợ Bến Thành" | TE (text) | O |
| directions_note | Spoken directions for hard-to-find entrances | "Vào hẻm 123, bên tay phải" | TE (text) | O |
| parking_info | Motorbike and car parking answer | "Gửi xe máy trước cửa, ô tô gửi số 125" | TE (text) | O |
| digital_links | Website / Zalo OA / fanpage the agent may reference | zalo.me/vietsmile | TE (text) | O |
| vat_invoice_policy | Whether a red invoice is available and what is needed | "Có xuất VAT, báo trước khi thanh toán" | TE (dropdown + note) | O |

### Entity: `branch_list`
Other locations. Exists so the agent can redirect a caller who wants the wrong branch instead of dead-ending.

| Column | Description | Example | Origin | Gate |
|---|---|---|---|---|
| branch_name [row] | Label | Chi nhánh Đà Nẵng | TE | O |
| branch_address [row] | Address | 45 Nguyễn Huệ, Đà Nẵng | TE | O |
| branch_phone [row] | Number to redirect to | 0236 xxx xxxx | TE | O |

## A2. Hours and open-state

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| operating_hours_by_weekday | 7-row day/open/close table, pre-filled by vertical template, tenant confirms or edits | T2-T7 08:00-20:00, CN 08:00-12:00 | TE (table, template default) | **R1** |
| break_periods | Closed windows inside an open day | 12:00-13:30 | TE (table) | O |
| is_open_now | Computed from hours, breaks, holidays. Gates booking vs after-hours behaviour | true | SD | **R1 (auto)** |
| current_datetime_local | Injected clock so "ngày mai" and "thứ 7 này" resolve correctly | 2026-08-19T14:30+07 | SD | **R1 (auto)** |

### Entity: `holiday_exceptions`
Vietnamese public holidays are pre-seeded by Fonnus. Tenant only confirms or overrides. Tet is the field that breaks agents.

| Column | Description | Example | Origin | Gate |
|---|---|---|---|---|
| holiday_label [row] | Name | Tết Nguyên Đán | SW pre-seed / TE | **R2** |
| date_range [row] | Start and end date | 14/02 - 22/02/2027 | SW pre-seed / TE | **R2** |
| closure_type [row] | Closed entirely / modified hours | Đóng cửa | TE (dropdown) | **R2** |
| modified_hours [row] | If not fully closed | 08:00-12:00 | TE | O |

## A3. Services and pricing

This is the highest-value and highest-effort part of onboarding. It is one entity plus a small number of tenant-level policy fields that apply across all rows.

### Entity: `service_catalog`
One row per sellable service. This is where the 10 minutes of real typing goes.

| Column | Description | Example | Origin | Gate |
|---|---|---|---|---|
| service_name [row] | Canonical name, pre-populated from vertical template | Tẩy trắng răng | TE (template default) | **R2** |
| service_aliases [row] | Colloquial names callers actually use, mapped to this row. Also feeds `keyterms` | "làm trắng răng", "tẩy răng" | TE (chips, SW-suggested) | O |
| price_from [row] | Lower bound | 1,500,000 | TE (number) | **R2** |
| price_to [row] | Upper bound. Equal to price_from if fixed | 2,500,000 | TE (number) | **R2** |
| price_unit [row] | The unit the price is quoted in. Per-row because it differs per service: implant is per tooth, braces per course | / lần | TE (dropdown) | **R2** |
| duration [row] | Typical chair or service time, drives slot fit | 45 phút | TE (dropdown) | O |
| service_note [row] | One line of detail the agent may add | "Không áp dụng cho răng nhiễm tetracycline" | TE (text) | O |
| is_bookable [row] | Whether a consultation for this service may be auto-booked | true | TE (toggle, default true) | O |

Tenant-level pricing policy, applied across every row:

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| pricing_disclosure_policy | exact / range / defer-to-consultation. Controls whether the agent voices numbers at all | range | TE (dropdown, default range) | **R2** |
| services_not_offered | Explicit negative list. Separate from `service_catalog` because these items have no price, duration, or row to attach to. Its only job is a clean deflection instead of an improvised answer | "Không làm chỉnh nha trẻ dưới 12 tuổi" | TE (chips) | O |
| package_bundles | Multi-service bundle prices | "Cạo vôi + tẩy trắng: 2tr" | TE (table) | O |
| instalment_options | Trả góp availability and terms | "Trả góp 0% qua thẻ, đơn từ 10tr" | TE (text) | O |
| payment_methods | Accepted payment types | Tiền mặt, chuyển khoản, thẻ | TE (checkbox, default cash+transfer) | O |


### Entity: `active_promotions`
Time-boxed. Auto-expires so the agent never quotes a dead offer.

| Column | Description | Example | Origin | Gate |
|---|---|---|---|---|
| promo_name [row] | Label | Ưu đãi tháng 9 | TE | O |
| promo_description [row] | What the agent says | "Giảm 20% tẩy trắng" | TE | O |
| valid_from / valid_to [row] | Auto-expiry dates | 01/09 - 30/09/2026 | TE (date) | O |

## A4. Scheduling and booking

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| ai_bookable_slots_per_day | Bounded carve-out. Number of slots per day the agent may auto-confirm | 6 | TE (number, default 6) | **R2** |
| slot_duration | Length of an AI-bookable consultation slot | 30 phút | TE (dropdown, default 30) | **R2** |
| slot_rules | Which windows of the day carve-out slots sit in | "09:00-11:30 và 14:00-17:00" | TE (table) | O |
| buffer_time | Gap between AI bookings | 10 phút | TE (dropdown, default 0) | O |
| max_bookings_per_day | Hard cap independent of slot count | 8 | TE (number) | O |
| availability_slots | The live internal ledger the agent reads and writes | 14:00 19/08 = free | SD | **R2 (auto)** |
| booking_confirmation_channel | Where the caller gets confirmation | SMS | TE (dropdown, default SMS) | **R2** |
| deposit_policy | Whether a deposit is requested and how much | "Không cần đặt cọc" | TE (text, default none) | O |
| cancellation_policy | What the agent states when a caller cancels | "Huỷ trước 2 tiếng, không mất phí" | TE (text) | O |
| no_show_policy | Consequence of a no-show | "Không phạt, gọi nhắc lại" | TE (text) | O |
| identity_verification_rule | What UC-3 requires before disclosing an existing appointment. Platform policy, PDPL-driven. Tenant may tighten, never loosen | Caller ID + ngày hẹn | SW (TE tighten only) | **R2 (auto)** |

## A5. Escalation and human availability

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| escalation_targets | Human phone number(s) for live transfer. Single most important tenant-entered field in the catalogue | 0912 345 678 (chị Lan) | TE (phone) | **R1** |
| after_hours_routine_behavior | What happens to a routine call outside hours: log and promise callback, or take a message | Log + hẹn gọi lại | TE (dropdown, default log+callback) | **R2** |
| callback_policy | Callback window the agent is allowed to promise | "Trong 30 phút giờ làm việc" | TE (text, default) | O |
| waiting_time_expectation | Typical on-site wait the agent may state | "Thường chờ 10-15 phút" | TE (text) | O |
| escalation_triggers | Non-medical triggers: caller asks for a human, caller is angry, two comprehension failures. System base set, tenant may add | "Khách yêu cầu gặp nhân viên" | SW (TE additions O) | **R1 (auto)** |

## A6. Voice and persona

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| voice_selection | Voice ID including gender | Nữ - giọng chuẩn | TE (dropdown, default set) | **R1** |
| voice_accent | Bắc / Nam. | Nam | TE (dropdown, default by city) | **R1** |
| speaking_speed | Slow / normal / fast | Normal | TE (slider, default normal) | O |
| personality_style | Professional-warm / friendly / formal. Maps to a phrasing pack, not free text | Chuyên nghiệp & ấm áp | TE (radio, default professional-warm) | O |
| greeting_compliance_block | Opening AI disclosure and recording notice. System-authored, legally reviewed once, non-editable | "Đây là trợ lý AI, cuộc gọi có ghi âm..." | SW | **R1 (auto)** |
| greeting_script_custom | The tenant's own greeting, played after the compliance block clears. Full free-text control | "Việt Smile xin chào, em có thể giúp gì ạ?" | TE (text, auto-generated default) | O |
| verbosity_cap | Maximum agent turn length. Protects short UC-5 calls against the minute-billing incentive | ≤ 2 câu mỗi lượt | SW | **R1 (auto)** |
| secondary_language | Whether the agent handles English-speaking callers | off | TE (toggle, default off) | O |

## A7. Speech recognition and turn-taking

New in v2. These are the fields that decide whether the agent feels natural or feels broken, independent of what it knows.

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| endpointing_silence_ms | How long a pause must last before the STT finalises a transcript and the agent may respond. Low values interrupt callers mid-sentence; high values feel sluggish. Vietnamese callers pause mid-utterance more than the default assumes | 700 ms | TE (slider, SW default) | O |
| silence_nudge_enabled | Whether the agent prompts a caller who has gone quiet | true | TE (toggle, default on) | O |
| silence_nudge_delay_seconds | Seconds of caller silence before a nudge fires | 7 | TE (number, default 7) | O |
| silence_nudge_script | What the nudge says. System default provided, tenant may rewrite | "Anh/chị còn nghe máy không ạ?" | SW default (TE editable) | O |
| end_call_after_silence_enabled | Whether the call is hung up after repeated unanswered nudges. Cost control as much as UX | true | TE (toggle, default on) | O |
| end_call_after_n_nudges | How many unanswered nudges before hanging up | 2 | TE (number, default 2) | O |
| call_closing_script | Wording used when ending on silence, so the hang-up is not abrupt | "Em chưa nghe rõ, em xin phép kết thúc. Anh/chị gọi lại giúp em ạ." | SW default (TE editable) | O |
| max_call_duration_seconds | Hard ceiling on a single call. Guards against a stuck loop billing minutes indefinitely. Added as a platform guardrail, not a tenant preference | 600 | SW | **R1 (auto)** |

### Entity: `keyterms`
A boost list handed to the STT so brand names, service names, and local proper nouns transcribe correctly. Rows are auto-populated from `business_name`, `service_catalog.service_name`, `service_aliases`, and the vertical keyterm pack. Tenant only adds what the system missed.

| Column | Description | Example | Origin | Gate |
|---|---|---|---|---|
| term [row] | The word or phrase to boost | Invisalign | SD (auto-derived) + TE (additions) | O |
| phonetic_hint [row] | Optional spelling hint for how Vietnamese callers actually say it | "In-vi-za-lai" | TE | O |
| source [row] | Where the term came from: derived, vertical pack, or tenant-added | derived | SD | O |

**Note:** `keyterms` is largely SD, which is deliberate. If the tenant has to type their own service names twice, they will not do it. The tenant-added rows are for competitor brands, doctor names, and street names the derivation misses.

## A8. Knowledge and behaviour steering

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| tenant_instructions | Tenant-written steering text. Injected as a sandboxed section inside the Fonnus-authored system prompt. Cannot override safety, compliance, or escalation behaviour. Passes an advertising-claim and injection filter before activation | "Luôn gợi ý khách đặt lịch tư vấn miễn phí" | TE (textarea) | O |
| knowledge_files | Uploaded documents ingested for retrieval. October scope | banggia2026.pdf | TE (file upload) | O |
| website_scrape_url | URL for automated knowledge extraction. October scope | vietsmile.vn | TE (url) | O |

### Entity: `faq_pairs`
Catch-all for questions that no structured field covers. Cheap for the tenant, high coverage gain.

| Column | Description | Example | Origin | Gate |
|---|---|---|---|---|
| question [row] | The caller question | "Có nhổ răng khôn không?" | TE | O |
| answer [row] | The agent's answer | "Có, bác sĩ Hùng phụ trách" | TE | O |

## A9. Compliance and safety (general)

Zero tenant effort. Written once by Fonnus, reviewed once by Vietnamese counsel, applied to every tenant.

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| ai_disclosure_script | Mandatory AI self-identification. Law 134/2025/QH15 | "Tôi là trợ lý AI của phòng khám" | SW | **R1 (auto)** |
| consent_notice_script | Recording-consent wording. Fires before the first caller utterance is recorded. Law 91/2025/QH15 | "Cuộc gọi được ghi âm để phục vụ chất lượng dịch vụ" | SW | **R1 (auto)** |
| recording_retention | Retention window, set by plan tier, quoted if a caller asks | 30 ngày | SD (by plan) | **R1 (auto)** |
| pdpl_data_minimisation_rule | What caller data the agent may collect per flow. Name and phone for booking; never ID or bank numbers | name, phone | SW | **R1 (auto)** |
| unresolvable_fallback_script | Generic dead-end wording | "Em xin ghi nhận, nhân viên sẽ gọi lại ạ" | SW | **R1 (auto)** |

---

# SECTION B – CLINIC PACK

Healthcare-only. Replaced wholesale when a new vertical is added.

## B1. Clinic identity and eligibility

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| insurance_bhyt_policy | BHYT and private insurance acceptance. One of the three most common logistics questions in a clinic | "Không nhận BHYT, hỗ trợ bảo hiểm tư nhân" | TE (dropdown + note) | **R2** |
| consultation_fee | Initial consultation fee, including free | 0 VND (miễn phí) | TE (number) | O |
| facility_capabilities | On-site equipment that changes answers | X-quang, CT Cone Beam | TE (chips) | O |
| pre_appointment_instructions | What to bring or prepare before the visit | "Mang CCCD và phim X-quang nếu có" | TE (text) | O |

## B2. Practitioners

### Entity: `practitioner_roster`
Callers ask for named doctors by default in Vietnamese clinics, and "bác sĩ Hùng hôm nay có ở phòng khám không" is a UC-5 question the agent currently cannot answer at all. Doctor names also feed `keyterms`, which is a second reason this table earns its place.

| Column | Description | Example | Origin | Gate |
|---|---|---|---|---|
| practitioner_name [row] | Name as callers say it | Nguyễn Văn Hùng | TE | O |
| title_credential [row] | Title voiced before the name | BS. CKI | TE (dropdown) | O |
| specialties [row] | Areas, mapped to `service_catalog` rows where possible | Chỉnh nha, Implant | TE (chips) | O |
| years_experience [row] | Quoted only if asked. Do not volunteer | 12 | TE (number) | O |
| working_days [row] | Days present, drives "có ở phòng khám không" | T2, T4, T6 | TE (checkbox) | O |
| working_hours_note [row] | Hours if narrower than clinic hours | "Chỉ buổi sáng" | TE | O |
| bookable_by_name [row] | Whether the agent may commit this practitioner in a booking. Off by default: committing a named doctor without a live schedule read is a broken promise | false | TE (toggle, default off) | O |
| languages [row] | Languages spoken, for the English-caller path | VN, EN | TE (chips) | O |
| practitioner_note [row] | One line the agent may offer | "Tu nghiệp tại Hàn Quốc" | TE (text) | O |

**Constraint:** if `bookable_by_name` is true on any row but `availability_slots` has no per-practitioner dimension, the agent must state availability as a request, not a confirmation. This is a build constraint for Phan Anh, not a tenant setting.

## B3. Clinical safety and escalation

| Field | Description | Example | Origin | Gate |
|---|---|---|---|---|
| after_hours_emergency_target | Where a post-procedure emergency goes at 23:00. Deliberately separate from `after_hours_routine_behavior`: a swelling complaint and a booking request must not share a path | BS trực: 0908 xxx xxx | TE (phone) | **R2** |
| emergency_red_flags | Symptom patterns triggering immediate escalation. Vertical pack, tenant may add rows but never remove one | "chảy máu không cầm", "khó thở", "sưng lan" | SW (TE additions O) | **R1 (auto)** |
| emergency_instruction_script | What the agent says while escalating a red-flag call | "Anh/chị giữ máy, em nối máy với bác sĩ ngay ạ" | SW | **R1 (auto)** |
| medical_advice_refusal_script | Fixed refusal and redirect for any request for medical advice, dosage, or reassurance | "Em không tư vấn y khoa được, em xin nối máy..." | SW | **R1 (auto)** |
| symptom_capture_rule | What symptom detail may be recorded and passed to staff. Health data is SENSITIVE under Law 91/2025/QH15 | Ghi nhận nguyên văn, không diễn giải | SW | **R1 (auto)** |

---

# Effort budget

## R1 – the 2-minute path

| Step | Field | Input | Est. |
|---|---|---|---|
| 1 | business_name | type | 10s |
| 2 | industry_vertical | dropdown | 5s |
| 3 | city | dropdown | 5s |
| 4 | address_full | type / autocomplete | 25s |
| 5 | operating_hours_by_weekday | confirm template | 20s |
| 6 | escalation_targets | type one number | 15s |
| 7 | voice_accent + voice_selection | confirm default | 10s |
| | **Total tenant effort** | | **~90s** |

Everything else marked R1 is SW or SD and costs zero seconds. At the end of R1 the agent can greet correctly, state the address and hours, answer "are you open now", escalate to a human, refuse medical advice safely, and disclose that it is an AI. It cannot quote prices or book, and it deflects both cleanly.

## R2 – the go-live path

Genuine typing concentrated in `service_catalog`: 8-15 rows at roughly 40 seconds each is 6-10 minutes. Everything else in R2 is a dropdown or a default to confirm, plus two phone numbers and the Tet closure dates. Realistic total 12-18 minutes. Optional fields, if a tenant works through them all, add another 10-15 minutes, which lands the fully-customised path in the 20-30 minute budget.

## Where the budget breaks

The 20-30 minute figure holds only while the 30-plus optional fields stay genuinely optional. If assisted onboarding converts them to strongly-encouraged, the real number is 45 minutes and the completion rate falls. Decide now whether the sales motion is allowed to walk tenants through the optional set.

---

# Extending to a new vertical

The split is designed so adding restaurants requires no change to Section A. The work is:

1. Write a new pack to replace Section B: identity fields, safety and escalation rules, and domain constraints. A restaurant pack would carry table capacity, party-size limits, dietary and allergen handling, and a food-safety escalation path rather than a clinical one.
2. Reseed the vertical-driven defaults inside Section A: `service_catalog` template rows, `keyterms` pack, `emergency_red_flags` equivalent, `escalation_triggers` base set.
3. Re-run legal review only on the new pack's SW scripts. Section A SW scripts (AI disclosure, consent, data minimisation, fallback) are vertical-independent and are reviewed once.

The test for whether a field belongs in Section A: would a restaurant owner recognise it? `parking_info`, `payment_methods`, `endpointing_silence_ms` yes. `insurance_bhyt_policy`, `practitioner_roster`, `price_qualifier_script` no.

---

# Deliberately excluded

- Per-call runtime data: caller number, live consent state, transcripts, call outcome. Call-log schema, not tenant config.
- CRM or EHR sync fields. Breaks the no-IT-department value proposition.
- Calendar API connection. Deferred. Internal ledger is the confirmed path.
- Staff Zalo notification preferences. Zalo notifications are deferred from MVP.
- Tenant-editable compliance scripts in any form. The one-legal-review-platform-wide model depends on this exclusion holding absolutely.
- Interruption/barge-in sensitivity as a tenant field. It is a pipeline tuning parameter, not something a clinic owner can reason about. Keep it platform-side until eval data says otherwise.
