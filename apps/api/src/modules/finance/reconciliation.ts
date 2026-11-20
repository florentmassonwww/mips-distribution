// Reconciliation view: recent statements, bank lines and payments still awaiting settlement.
import { type Db, type Row, all } from "../../core/db.ts";

export interface ReconciliationView {
  statements: Row[];
  lines: Row[];
  unsettled: Row[];
}

export function getReconciliation(db: Db, companyId: string): ReconciliationView {
  return {
    statements: all(
      db,
      "SELECT s.*, u.name AS imported_by_name FROM bank_statements s LEFT JOIN users u ON u.id = s.imported_by WHERE s.company_id = ? ORDER BY s.imported_at DESC LIMIT 30",
      companyId,
    ),
    lines: all(
      db,
      `SELECT b.id, b.value_date, b.reference, b.label, b.gross_minor, b.fee_minor, b.net_minor, b.match_status, i.number AS invoice, p.fee_expected_minor, p.fee_expected_known, p.method
    FROM bank_lines b LEFT JOIN payments p ON p.id = b.payment_id LEFT JOIN invoices i ON i.id = p.invoice_id WHERE b.company_id = ? ORDER BY b.rowid DESC LIMIT 300`,
      companyId,
    ),
    unsettled: all(
      db,
      `SELECT p.id, p.provider_ref, p.method, p.amount_minor - p.refunded_minor AS amount_minor, p.confirmed_at, i.number AS invoice FROM payments p JOIN invoices i ON i.id = p.invoice_id
    WHERE p.company_id = ? AND p.status = 'confirmed' AND p.settlement_status = 'unsettled' ORDER BY p.confirmed_at`,
      companyId,
    ),
  };
}
