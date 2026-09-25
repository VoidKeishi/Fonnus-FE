import { COMPARISON_MATRIX, MATRIX_FOOTNOTE, PLANS } from '@/data/pricing'
import { MatrixDisclosure } from './matrix-disclosure'

const COLUMNS = PLANS.map((plan) => plan.name)
/** The column of the plan the cards recommend. */
const FEATURED = PLANS.findIndex((plan) => plan.featured)

/* One track template for the band, the head and every row keeps the columns true. */
const TRACKS = 'grid grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(96px,1fr))] px-4'
const ROW = `relative ${TRACKS} items-center py-3 text-body-sm leading-(--leading-body) shadow-[inset_0_-1px_0_var(--border-hairline)] transition-[background-color] duration-[120ms] ease-out`
const CELL = 'text-center font-num tabular-nums'
/*
 * A screen reader names these marks as symbols, and not in Vietnamese; each is
 * read as the word it stands for instead, while the mark stays what is seen.
 */
const SPOKEN: Record<string, string> = { '✓': 'Có', '✕': 'Không', '—': 'Không có' }

/**
 * "Xem bảng so sánh đầy đủ": every plan side by side, closed on load. A server
 * component; only the open/closed toggle around it is client-side.
 *
 * The grid is divs so the featured column's band can sit behind the rows on
 * the same track template; the table roles give a screen reader the rows and
 * columns the layout draws.
 */
export function ComparisonMatrix() {
  return (
    <div data-reveal="0" className="mt-10">
      <MatrixDisclosure>
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[720px]">
            <div role="table" className="relative">
              {/* The "Tiêu chuẩn" card's clay, carried down its column behind the rows. */}
              <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${TRACKS}`}>
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

              <div
                role="row"
                className={`relative ${TRACKS} rounded-t-md bg-surface-page py-3.5 text-ui leading-(--leading-body) font-semibold`}
              >
                <span role="columnheader" />
                {COLUMNS.map((column, i) => (
                  <span key={column} role="columnheader" className={`text-center ${i === FEATURED ? 'text-text-accent' : ''}`}>
                    {column}
                  </span>
                ))}
              </div>

              {COMPARISON_MATRIX.map((row) =>
                row.kind === 'group' ? (
                  // Group rows sit on paper, which hides the band behind them, and are not hover targets.
                  <div key={row.label} role="row" className={`${ROW} bg-surface-page`}>
                    <span
                      role="rowheader"
                      className="text-eyebrow leading-(--leading-body) font-semibold tracking-eyebrow text-text-accent uppercase"
                    >
                      {row.label}
                    </span>
                    {COLUMNS.map((column) => (
                      <span key={column} role="cell" />
                    ))}
                  </div>
                ) : (
                  <div
                    key={row.label}
                    role="row"
                    className={`${ROW} bg-transparent hover:bg-[color-mix(in_srgb,var(--text-eyebrow)_5%,transparent)]`}
                  >
                    <span role="rowheader" className="text-text-body">
                      {row.label}
                    </span>
                    {row.cells.map((cell, i) => (
                      <span
                        key={COLUMNS[i]}
                        role="cell"
                        className={`${CELL} ${i === FEATURED ? 'font-medium text-text-body' : 'text-text-muted'}`}
                      >
                        {cell in SPOKEN ? (
                          <>
                            <span aria-hidden="true">{cell}</span>
                            <span className="sr-only">{SPOKEN[cell]}</span>
                          </>
                        ) : (
                          cell
                        )}
                      </span>
                    ))}
                  </div>
                ),
              )}
            </div>

            <p className="m-0 mt-4 text-ui leading-(--leading-body) text-text-muted">{MATRIX_FOOTNOTE}</p>
          </div>
        </div>
      </MatrixDisclosure>
    </div>
  )
}
