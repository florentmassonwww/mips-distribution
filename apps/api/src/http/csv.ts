// CSV exports: most list endpoints return CSV instead of JSON with `?format=csv`.
import type { Context } from "hono";
import { formatMinor, toCsv } from "../core/format.ts";
import type { Row } from "../core/db.ts";

export type CsvColumns = Array<[key: string, header: string]>;

export const wantsCsv = (c: Context): boolean => c.req.query("format") === "csv";

/** CSV attachment named `<filename>.csv`. */
export function csvResponse(c: Context, filename: string, rows: Row[], columns: CsvColumns): Response {
  return c.body(toCsv(rows, columns), 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}.csv"`,
  });
}

/** Copies of the rows with the given minor-unit amounts written as decimals ("1250.00"). */
export function withDecimalAmounts(rows: Row[], ...keys: string[]): Row[] {
  return rows.map((row) => {
    const copy = { ...row };
    for (const key of keys) copy[key] = formatMinor(copy[key]);
    return copy;
  });
}
