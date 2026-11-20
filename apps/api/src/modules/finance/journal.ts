// Finance lists: the payment journal and the invoices.
import { type Db, type Row, all } from "../../core/db.ts";
import { dayBounds, isValidDay } from "../distribution/days.ts";

export interface JournalFilters {
  status?: string;
  method?: string;
  /** Settlement status; only confirmed or refunded payments can be settled. */
  settlement?: string;
  /** Business day of creation; ignored when invalid. */
  day?: string;
}

/** Latest 500 payment attempts of the company, newest first. */
export function listJournal(db: Db, companyId: string, filters: JournalFilters = {}): Row[] {
  const where = ["p.company_id = ?"];
  const params: string[] = [companyId];
  if (filters.status) {
    where.push("p.status = ?");
    params.push(filters.status);
  }
  if (filters.method) {
    where.push("p.method = ?");
    params.push(filters.method);
  }
  if (filters.settlement) {
    where.push("p.settlement_status = ? AND p.status IN ('confirmed','refunded')");
    params.push(filters.settlement);
  }
  if (filters.day && isValidDay(filters.day)) {
    where.push("p.created_at >= ? AND p.created_at < ?");
    params.push(...dayBounds(filters.day));
  }
  return all(
    db,
    `SELECT p.id, p.created_at, p.updated_at, p.confirmed_at, p.settled_at, p.method, p.amount_minor, p.refunded_minor, p.currency, p.status, p.settlement_status,
      p.provider_ref, p.failure_reason, p.verify_reason, p.confirmed_via, p.fee_expected_minor, p.fee_expected_known, p.fee_actual_minor,
      i.number AS invoice, i.id AS invoice_id, o.number AS order_number, o.id AS order_id, c.name AS customer, u.name AS agent, co.name AS company
    FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN orders o ON o.id = p.order_id JOIN customers c ON c.id = i.customer_id
    JOIN companies co ON co.id = p.company_id LEFT JOIN users u ON u.id = p.agent_id
    WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC, p.rowid DESC LIMIT 500`,
    ...params,
  );
}

/** Latest 500 invoices, with the amount settled in bank and the accounting entry status. */
export function listInvoices(db: Db, companyId: string): Row[] {
  return all(
    db,
    `SELECT i.id, i.number, i.issued_at, i.amount_minor, i.paid_minor, i.refunded_minor, i.status, i.order_id, o.number AS order_number, c.name AS customer, u.name AS agent, r.name AS route,
      (SELECT COALESCE(SUM(amount_minor - refunded_minor), 0) FROM payments WHERE invoice_id = i.id AND settlement_status = 'settled') AS settled_minor,
      (SELECT status FROM erp_entries WHERE company_id = i.company_id AND kind = 'invoice' AND entity_id = i.id) AS erp_status
    FROM invoices i JOIN orders o ON o.id = i.order_id JOIN customers c ON c.id = i.customer_id LEFT JOIN users u ON u.id = i.agent_id LEFT JOIN routes r ON r.id = i.route_id
    WHERE i.company_id = ? ORDER BY i.issued_at DESC, i.rowid DESC LIMIT 500`,
    companyId,
  );
}
