// Fictitious demonstration data: two distribution companies with a week of activity and a sports
// club with two years of history. Everything is marked "(démo)"; nothing refers to real people.
import { type Db, get, transaction } from "../core/db.ts";
import { type DemoConnectorSet as Connectors } from "../modules/connectors/types.ts";
import { seedClub } from "./club.ts";
import { seedPlatformAndCompanies } from "./companies.ts";
import { seedDistributionHistory } from "./distribution-history.ts";

/** Tables emptied by a demo reset, children before parents (foreign keys). */
export const DEMO_TABLES = [
  "gate_events",
  "gate_devices",
  "member_reminders",
  "member_payments",
  "member_charges",
  "members",
  "club_plans",
  "audit_log",
  "sync_actions",
  "daily_closes",
  "erp_entries",
  "exceptions",
  "bank_lines",
  "bank_statements",
  "demo_provider_tx",
  "payment_events",
  "payments",
  "invoices",
  "deliveries",
  "order_lines",
  "orders",
  "stock_movements",
  "vehicle_stock",
  "warehouse_stock",
  "route_stops",
  "routes",
  "price_list_items",
  "products",
  "customers",
  "price_lists",
  "counters",
  "users",
  "sites",
  "company_modules",
  "companies",
] as const;

/** True once at least one company exists (the seed only runs on an empty database). */
export const hasData = (db: Db): boolean => !!get(db, "SELECT 1 FROM companies LIMIT 1");

/** Seeds the whole demo dataset. The order of the steps fixes every generated identifier. */
export async function seedDemo(db: Db, connectors: Connectors, now: Date = new Date()): Promise<void> {
  transaction(db, () => seedPlatformAndCompanies(db, now));
  await seedDistributionHistory(db, connectors, now);
  await seedClub(db, connectors, now);
}

/** Erases every business table and seeds the demo dataset again. */
export async function resetDemo(db: Db, connectors: Connectors, now: Date = new Date()): Promise<void> {
  transaction(db, () => {
    for (const table of DEMO_TABLES) db.exec(`DELETE FROM ${table}`);
  });
  await seedDemo(db, connectors, now);
}

export { seedClub } from "./club.ts";
export { seedCompany } from "./companies.ts";
