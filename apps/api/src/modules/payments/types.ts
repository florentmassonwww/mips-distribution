// Rows of the payment tables, as stored.
import type { PaymentMethod } from "../connectors/index.ts";

export type PaymentStatus = "pending" | "to_verify" | "confirmed" | "failed" | "refunded";
export type InvoiceStatus = "unpaid" | "pending" | "to_verify" | "partially_paid" | "paid" | "failed" | "refunded";

/** One row per payment attempt. */
export interface PaymentRow {
  id: string;
  company_id: string;
  invoice_id: string;
  order_id: string;
  agent_id: string | null;
  method: PaymentMethod;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  refunded_minor: number;
  provider_ref: string | null;
  idempotency_key: string;
  link_token: string | null;
  presentation_json: string;
  failure_reason: string | null;
  verify_reason: string | null;
  fee_expected_minor: number;
  /** 0 when the fee was to be agreed at confirmation: fee_expected_minor (0) is then not an expectation. */
  fee_expected_known: number;
  fee_actual_minor: number | null;
  settlement_status: "unsettled" | "settled";
  settled_at: string | null;
  bank_line_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  confirmed_at: string | null;
  confirmed_via: string | null;
}

export interface InvoiceRow {
  id: string;
  company_id: string;
  number: string;
  order_id: string;
  customer_outlet_id: string;
  route_id: string | null;
  agent_id: string | null;
  currency: string;
  amount_minor: number;
  paid_minor: number;
  refunded_minor: number;
  status: InvoiceStatus;
  issued_at: string;
}

/** How a confirmation was obtained (stored in payments.confirmed_via). */
export type ConfirmationSource = "notification" | "status_query" | "bank_statement";
