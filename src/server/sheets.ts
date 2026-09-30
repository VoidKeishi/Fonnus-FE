import 'server-only'
import { googleFetch, sheetsAccessToken } from './google-token'
import type { GoogleSheetsConfig } from './env'

/*
 * Appending rows to a tab of the leads spreadsheet (ADR 0005 point 7). `RAW`
 * stores each cell exactly as sent — a phone keeps its leading 0 and typed
 * text is never evaluated as a formula; `INSERT_ROWS` adds rows rather than
 * overwriting whatever sits below the table.
 */

/**
 * One request for any number of rows, the token included, both under the
 * caller's deadline. Throws `GoogleRequestError` on any failure.
 */
export async function appendRows(
  config: GoogleSheetsConfig,
  tab: string,
  rows: string[][],
  signal: AbortSignal,
): Promise<void> {
  const token = await sheetsAccessToken(config, signal)
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}` +
    `/values/${encodeURIComponent(`${tab}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  const response = await googleFetch('append', url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows }),
    signal,
  })
  // The answer describes the range written; nothing here needs it.
  await response.body?.cancel()
}
