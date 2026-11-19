// Receipt of an invoice: invoice, delivered lines, delivery proof and payment attempts.
import type { SessionUser } from "../../core/actor.ts";
import { type Db, type Row, all, get } from "../../core/db.ts";
import { notFound } from "../../core/errors.ts";
import { paymentView } from "./legacy-imports.ts";
import { assertInvoiceAccess } from "./lookups.ts";
import type { InvoiceRow, PaymentRow } from "./types.ts";

export interface ReceiptInvoice extends InvoiceRow {
  customer: string;
  address: string | null;
  company: string;
  order_number: string;
}

interface DeliveryRow {
  returns_json: string;
  returns_minor: number;
  pod_name: string | null;
  at: string;
  outcome: string;
  pod_signature: string | null;
}

export interface Receipt {
  invoice: ReceiptInvoice;
  lines: Row[];
  delivery: (Omit<DeliveryRow, "returns_json"> & { returns_json: undefined; returns: unknown }) | null;
  payments: Array<Record<string, unknown>>;
}

export function getReceipt(db: Db, user: SessionUser, invoiceId: string): Receipt {
  const invoice = get<ReceiptInvoice>(
    db,
    `SELECT i.*, c.name AS customer, c.address, co.name AS company, o.number AS order_number
    FROM invoices i JOIN customers c ON c.id = i.customer_id JOIN companies co ON co.id = i.company_id JOIN orders o ON o.id = i.order_id WHERE i.id = ? AND i.company_id = ?`,
    invoiceId,
    user.companyId,
  );
  if (!invoice) throw notFound("Facture");
  assertInvoiceAccess(db, user, invoice);
  const delivery = get<DeliveryRow>(
    db,
    "SELECT returns_json, returns_minor, pod_name, at, outcome, pod_signature FROM deliveries WHERE order_id = ?",
    invoice.order_id,
  );
  return {
    invoice,
    lines: all(
      db,
      "SELECT p.name AS product, p.unit, l.qty_ordered, l.qty_delivered, l.unit_price_minor FROM order_lines l JOIN products p ON p.id = l.product_id WHERE l.order_id = ?",
      invoice.order_id,
    ),
    // returns_json stays as an undefined key (dropped from the JSON) for an identical key order.
    delivery: delivery ? { ...delivery, returns_json: undefined, returns: JSON.parse(delivery.returns_json) } : null,
    payments: all<PaymentRow>(db, "SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at", invoiceId).map(paymentView),
  };
}
