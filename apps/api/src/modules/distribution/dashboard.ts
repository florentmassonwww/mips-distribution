// Head office dashboard: today's sales, deliveries, money, open exceptions and recent field activity.
import type { SQLInputValue } from "node:sqlite";
import { type Db, all, get } from "../../core/db.ts";
import { businessDay, iso } from "../../core/time.ts";
import { dayBounds } from "./days.ts";
import { listRoutes } from "./delivery-routes.ts";

export function dashboard(db: Db, companyId: string, now: Date = new Date()) {
  const day = businessDay(now);
  const [dayStart, dayEnd] = dayBounds(day);
  // Every query is scoped to the company (first parameter).
  const value = (sql: string, ...params: SQLInputValue[]): number => get<{ n: number }>(db, sql, companyId, ...params)!.n;
  return {
    day,
    generatedAt: iso(now),
    sales: {
      invoiced: value("SELECT COALESCE(SUM(amount_minor), 0) AS n FROM invoices WHERE company_id = ? AND issued_at >= ? AND issued_at < ?", dayStart, dayEnd),
      invoices: value("SELECT COUNT(*) AS n FROM invoices WHERE company_id = ? AND issued_at >= ? AND issued_at < ?", dayStart, dayEnd),
      routeSales: value(
        "SELECT COUNT(*) AS n FROM orders WHERE company_id = ? AND kind = 'route_sale' AND created_at >= ? AND created_at < ?",
        dayStart,
        dayEnd,
      ),
    },
    deliveries: {
      planned: value(
        "SELECT COUNT(*) AS n FROM orders o JOIN routes r ON r.id = o.route_id WHERE o.company_id = ? AND r.day = ? AND o.kind = 'preorder' AND o.status != 'cancelled'",
        day,
      ),
      done: value(
        "SELECT COUNT(*) AS n FROM orders o JOIN routes r ON r.id = o.route_id WHERE o.company_id = ? AND r.day = ? AND o.kind = 'preorder' AND o.status IN ('delivered','partially_delivered')",
        day,
      ),
      partial: value(
        "SELECT COUNT(*) AS n FROM orders o JOIN routes r ON r.id = o.route_id WHERE o.company_id = ? AND r.day = ? AND o.status = 'partially_delivered'",
        day,
      ),
      refused: value(
        "SELECT COUNT(*) AS n FROM orders o JOIN routes r ON r.id = o.route_id WHERE o.company_id = ? AND r.day = ? AND o.status = 'refused'",
        day,
      ),
    },
    money: {
      confirmed: value(
        "SELECT COALESCE(SUM(amount_minor - refunded_minor), 0) AS n FROM payments WHERE company_id = ? AND status IN ('confirmed','refunded') AND confirmed_at >= ? AND confirmed_at < ?",
        dayStart,
        dayEnd,
      ),
      settled: value(
        "SELECT COALESCE(SUM(amount_minor - refunded_minor), 0) AS n FROM payments WHERE company_id = ? AND settlement_status = 'settled' AND confirmed_at >= ? AND confirmed_at < ?",
        dayStart,
        dayEnd,
      ),
      outstanding: value(
        "SELECT COALESCE(SUM(amount_minor - paid_minor + refunded_minor), 0) AS n FROM invoices WHERE company_id = ? AND status NOT IN ('paid','refunded')",
      ),
      pending: value("SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'pending'"),
      toVerify: value("SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'to_verify'"),
      failed: value(
        "SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'failed' AND created_at >= ? AND created_at < ?",
        dayStart,
        dayEnd,
      ),
    },
    exceptions: {
      ops: value("SELECT COUNT(*) AS n FROM exceptions WHERE company_id = ? AND status = 'open' AND domain = 'ops'"),
      finance: value("SELECT COUNT(*) AS n FROM exceptions WHERE company_id = ? AND status = 'open' AND domain = 'finance'"),
    },
    byMethod: all(
      db,
      `SELECT method, COUNT(*) AS count, SUM(amount_minor - refunded_minor) AS amount_minor FROM payments
      WHERE company_id = ? AND status IN ('confirmed','refunded') AND confirmed_at >= ? AND confirmed_at < ? GROUP BY method`,
      companyId,
      dayStart,
      dayEnd,
    ),
    routes: listRoutes(db, companyId).filter((route) => route.day === day),
    recent: all<{ at: string; action: string; details_json: string; actor: string | null }>(
      db,
      `SELECT a.at, a.action, a.details_json, u.name AS actor FROM audit_log a LEFT JOIN users u ON u.id = a.actor
      WHERE a.company_id = ? AND (a.action LIKE 'delivery.%' OR a.action LIKE 'payment.%' OR a.action LIKE 'route.%') ORDER BY a.at DESC, a.rowid DESC LIMIT 14`,
      companyId,
    ).map((entry) => ({ ...entry, details_json: undefined, details: JSON.parse(entry.details_json) as unknown })),
  };
}
