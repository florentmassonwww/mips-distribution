// Access to payments and invoices by the signed-in user.
import type { SessionUser } from "../../core/actor.ts";
import { type Db, get } from "../../core/db.ts";
import { forbidden } from "../../core/errors.ts";
import { getCompanyPayment } from "./legacy-imports.ts";
import type { InvoiceRow, PaymentRow } from "./types.ts";

/** An agent only sees the invoices of their own deliveries or routes; other roles see all of their company. */
export function assertInvoiceAccess(db: Db, user: SessionUser, invoice: Pick<InvoiceRow, "agent_id" | "route_id">): void {
  if (user.role !== "agent") return;
  const routeAgentId = invoice.route_id
    ? get<{ agent_id: string | null }>(db, "SELECT agent_id FROM routes WHERE id = ?", invoice.route_id)?.agent_id
    : null;
  if (invoice.agent_id !== user.id && routeAgentId !== user.id) throw forbidden();
}

export function getInvoice(db: Db, invoiceId: string): InvoiceRow {
  return get<InvoiceRow>(db, "SELECT * FROM invoices WHERE id = ?", invoiceId)!;
}

/** Payment of the user's company that the user may see; 404 or 403 otherwise. */
export function getPaymentForUser(db: Db, user: SessionUser, paymentId: string): PaymentRow {
  const payment = getCompanyPayment(db, user.companyId, paymentId);
  assertInvoiceAccess(db, user, getInvoice(db, payment.invoice_id));
  return payment;
}
