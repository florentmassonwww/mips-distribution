// Text formats for exports: CSV and amounts.

/** CSV with a BOM and CRLF line ends. Cells starting with = + @ or - (not a number) are neutralized against formula injection. */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: Array<[keyof T & string, string]>): string {
  const cell = (value: unknown): string => {
    let text = value == null ? "" : String(value);
    if (/^[=+@]/.test(text) || /^-(?!\d)/.test(text)) text = `'${text}`;
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.map(([, header]) => cell(header)).join(",")];
  for (const row of rows) lines.push(columns.map(([key]) => cell(row[key])).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Amount in minor units as a decimal string ("1250.00", "-3.05"); empty for null. */
export function formatMinor(minor: number | null | undefined): string {
  if (minor == null) return "";
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
