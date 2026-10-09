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
 * The band and the columns share one arithmetic: of 5.6 parts of the width,
 * the criteria column takes 1.6 and each plan column 1. The criteria column
 * has no pixel floor: table layout is not guaranteed to honour a column width
 * that mixes a length with a percentage, and the band's grid, which would
 * honour it, would then drift off its column on a phone.
 */
const PLAN_COLUMN = 'w-[17.8571%]'
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
          <div className="min-w-[770px]">
            {/* Hosts the band at the table's exact width, and stops it short of the footnote. */}
            <div className="relative">
              {/* The "Tiêu chuẩn" card's clay, carried down its column behind the rows. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid grid-cols-[28.5714%_repeat(4,17.8571%)]"
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
                  <col className="w-[28.5714%]" />
                  {COLUMNS.map((column) => (
                    <col key={column} className={PLAN_COLUMN} />
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
