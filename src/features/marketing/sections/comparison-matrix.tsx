import { COMPARISON_MATRIX, MATRIX_FOOTNOTE, PLANS, type MatrixRow } from '@/data/pricing'
import { MatrixDisclosure } from './matrix-disclosure'

const COLUMNS = PLANS.map((plan) => plan.name)
/** The column of the plan the cards recommend. */
const FEATURED = PLANS.findIndex((plan) => plan.featured)

type Group = { label: string; rows: Extract<MatrixRow, { kind: 'row' }>[] }

/** Each group heading with the criteria under it, so every group becomes its own table body. */
const GROUPS = COMPARISON_MATRIX.reduce<Group[]>((groups, row) => {
  if (row.kind === 'group') return [...groups, { label: row.label, rows: [] }]
  const current = groups.at(-1)
  // The data must open with a group; a criterion above it would have no table body to land in.
  if (!current) throw new Error(`COMPARISON_MATRIX: "${row.label}" comes before the first group`)
  current.rows.push(row)
  return groups
}, [])

/*
 * The prototype's geometry: a 16px inset on both sides, then the criteria
 * column at 1.6 parts and each plan column at 1 part of what is left, with the
 * criteria column never under 220px. A table column takes only a plain
 * percentage — Chrome ignores a length mixed in through min, max or calc on a
 * col — and the inset lives inside the first and last cells, so the
 * percentages below are that geometry worked out at two widths. Under an 800px
 * viewport the table is always its 720px minimum, where the first set is exact
 * (criteria column 220px). From 800px up the second set is exact at the
 * section's full 1280px and within 3px of the prototype down to a 900px
 * viewport. The band's grid uses the same sets, so it stays on its column.
 * Indexed by column: criteria, the plans, and the last plan, which also holds
 * the right inset.
 */
const COLUMN_WIDTHS = [
  'w-[32.7778%] min-[800px]:w-[29.1071%]',
  'w-[16.25%] min-[800px]:w-[17.4107%]',
  'w-[16.25%] min-[800px]:w-[17.4107%]',
  'w-[16.25%] min-[800px]:w-[17.4107%]',
  'w-[18.4722%] min-[800px]:w-[18.6607%]',
]
const BAND_TRACKS =
  'grid-cols-[32.7778%_16.25%_16.25%_16.25%_18.4722%] min-[800px]:grid-cols-[29.1071%_17.4107%_17.4107%_17.4107%_18.6607%]'
const CELL = 'py-3 align-middle shadow-[inset_0_-1px_0_var(--border-hairline)] text-body-sm leading-(--leading-body)'
const HEAD_CELL = 'bg-surface-page py-3.5 text-ui leading-(--leading-body) font-semibold text-center align-middle'
/*
 * A screen reader names these marks as symbols, and not in Vietnamese; each is
 * read as the word it stands for instead, while the mark stays what is seen.
 */
const SPOKEN: Record<string, string> = { '✓': 'Có', '✕': 'Không', '—': 'Không có' }

/**
 * "Xem bảng so sánh đầy đủ": every plan side by side, closed on load. A server
 * component; only the open/closed toggle around it is client-side.
 *
 * A real table, so a text extractor keeps the rows and columns a screen reader
 * already had. The table elements keep their native display: changing it drops
 * the table semantics in browsers. The featured column's band is a separate
 * grid behind the table on the same column widths.
 */
export function ComparisonMatrix() {
  return (
    <div data-reveal="0" className="mt-10">
      <MatrixDisclosure>
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Hosts the band at the table's exact width, and stops it short of the footnote. */}
            <div className="relative">
              {/* The "Tiêu chuẩn" card's clay, carried down its column behind the rows. */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 grid ${BAND_TRACKS}`}
              >
                <span />
                {COLUMNS.map((column, i) => (
                  <span
                    key={column}
                    className={
                      i === FEATURED
                        ? 'rounded-md bg-[color-mix(in_srgb,var(--text-eyebrow)_9%,transparent)] shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--text-eyebrow)_28%,transparent)]'
                        : undefined
                    }
                  />
                ))}
              </div>

              {/* Positioned so it paints over the band: the paper of the head and group rows hides it. */}
              <table className="relative w-full table-fixed border-separate border-spacing-0">
                <caption>
                  <span className="sr-only">Bảng so sánh đầy đủ các gói</span>
                </caption>
                <colgroup>
                  <col className={COLUMN_WIDTHS[0]} />
                  {COLUMNS.map((column, i) => (
                    <col key={column} className={COLUMN_WIDTHS[i + 1]} />
                  ))}
                </colgroup>

                <thead>
                  <tr>
                    <th scope="col" className={`${HEAD_CELL} rounded-tl-md pl-4`}>
                      <span className="sr-only">Tiêu chí</span>
                    </th>
                    {COLUMNS.map((column, i) => (
                      <th
                        key={column}
                        scope="col"
                        className={`${HEAD_CELL} ${i === FEATURED ? 'text-text-accent' : ''} ${i === COLUMNS.length - 1 ? 'rounded-tr-md pr-4' : ''}`}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                {GROUPS.map((group) => (
                  <tbody key={group.label}>
                    {/* Group rows sit on paper, which hides the band behind them, and are not hover targets. */}
                    <tr className="bg-surface-page">
                      <th
                        scope="rowgroup"
                        colSpan={COLUMNS.length + 1}
                        className="shadow-[inset_0_-1px_0_var(--border-hairline)] py-3 pr-4 pl-4 text-left align-middle text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-accent uppercase"
                      >
                        {group.label}
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <tr
                        key={row.label}
                        className="transition-[background-color] duration-[120ms] ease-out hover:bg-[color-mix(in_srgb,var(--text-eyebrow)_5%,transparent)]"
                      >
                        <th scope="row" className={`${CELL} pl-4 text-left font-normal text-text-body`}>
                          {row.label}
                        </th>
                        {row.cells.map((cell, i) => (
                          <td
                            key={COLUMNS[i]}
                            className={`${CELL} text-center font-num tabular-nums ${i === FEATURED ? 'font-medium text-text-body' : 'text-text-muted'} ${i === COLUMNS.length - 1 ? 'pr-4' : ''}`}
                          >
                            {cell in SPOKEN ? (
                              <>
                                <span aria-hidden="true">{cell}</span>
                                <span className="sr-only">{SPOKEN[cell]}</span>
                              </>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>

            <p className="m-0 mt-4 text-ui leading-(--leading-body) text-text-muted">{MATRIX_FOOTNOTE}</p>
          </div>
        </div>
      </MatrixDisclosure>
    </div>
  )
}
