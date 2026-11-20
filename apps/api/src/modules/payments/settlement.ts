// Bank settlement of a payment, found on an imported bank statement.
import { confirmedBySettlement } from "@mips/core";
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, get, run } from "../../core/db.ts";
import { iso } from "../../core/time.ts";
import { queueErpEntry as queueAccountingEntry } from "../distribution/exceptions.ts";
import { confirmPayment, touchPayment } from "./lifecycle.ts";
import type { PaymentRow } from "./types.ts";

export interface SettlementLine {
  /** Bank line id. */
  id: string;
  feeMinor: number;
  valueDate: string;
}

/**
 * Records the settlement. The money on the bank account is a proof of payment: an attempt still
 * pending or to verify is confirmed first.
 */
export function settlePayment(db: Db, payment: PaymentRow, line: SettlementLine, actor: Actor, now: Date): void {
  if (confirmedBySettlement(payment.status)) confirmPayment(db, payment, "bank_statement", actor, now);
  run(
    db,
    "UPDATE payments SET settlement_status = 'settled', settled_at = ?, fee_actual_minor = ?, bank_line_id = ? WHERE id = ?",
    iso(now),
    line.feeMinor,
    line.id,
    payment.id,
  );
  touchPayment(db, payment.id, now);

  const settled = get<PaymentRow>(db, "SELECT * FROM payments WHERE id = ?", payment.id)!;
  const grossMinor = settled.amount_minor - settled.refunded_minor;
  queueAccountingEntry(
    db,
    payment.company_id,
    "settlement",
    payment.id,
    `Règlement bancaire ${payment.provider_ref}`,
    grossMinor - line.feeMinor,
    { providerRef: payment.provider_ref, grossMinor, feeMinor: line.feeMinor, valueDate: line.valueDate },
    now,
  );
  const invoice = get<{ number: string }>(db, "SELECT number FROM invoices WHERE id = ?", payment.invoice_id)!;
  recordAudit(
    db,
    actor,
    "payment.settled",
    "payment",
    payment.id,
    {
      invoice: invoice.number,
      method: payment.method,
      amountMinor: grossMinor,
      feeMinor: line.feeMinor,
      providerRef: payment.provider_ref,
      valueDate: line.valueDate,
    },
    payment.company_id,
    now,
  );
}
