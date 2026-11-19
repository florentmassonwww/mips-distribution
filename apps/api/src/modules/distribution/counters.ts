// Per-company sequential document numbers (orders, invoices, club references…).
import { type Db, get, run } from "../../core/db.ts";

/** Next number of the company's `name` counter, formatted as `PREFIX-000042`. */
export function nextNumber(db: Db, companyId: string, name: string, prefix: string): string {
  run(
    db,
    "INSERT INTO counters (company_id, name, value) VALUES (?,?,1) ON CONFLICT (company_id, name) DO UPDATE SET value = value + 1",
    companyId,
    name,
  );
  const { value } = get<{ value: number }>(db, "SELECT value FROM counters WHERE company_id = ? AND name = ?", companyId, name)!;
  return `${prefix}-${String(value).padStart(6, "0")}`;
}
