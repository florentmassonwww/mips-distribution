// Database rows, company settings and connector contracts used by the club module.
import type { StatusReport } from "@mips/core";

export type MemberStatus = "active" | "suspended" | "resigned";
export type ChargeKind = "dues" | "consumption" | "fee";
export type ChargeStatus = "open" | "paid" | "cancelled";
export type MemberPaymentMethod = "link" | "bank_transfer" | "cash";
export type MemberPaymentStatus = "pending" | "to_verify" | "confirmed" | "failed";
export type GateDecision = "allow" | "flag" | "deny";

export interface MemberRow {
  id: string;
  company_id: string;
  number: string;
  name: string;
  email: string;
  phone: string;
  plan_id: string | null;
  status: MemberStatus;
  reference: string;
  badge: string;
  portal_token: string;
  joined_at: string;
  created_at: string;
}

export interface MemberChargeRow {
  id: string;
  company_id: string;
  member_id: string;
  number: string;
  kind: ChargeKind;
  outlet: string;
  label: string;
  period: string | null;
  amount_minor: number;
  allocated_minor: number;
  due_date: string;
  status: ChargeStatus;
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_by: string;
  created_at: string;
}

export interface MemberPaymentRow {
  id: string;
  company_id: string;
  member_id: string;
  method: MemberPaymentMethod;
  amount_minor: number;
  currency: string;
  status: MemberPaymentStatus;
  provider_ref: string | null;
  idempotency_key: string;
  reference: string;
  failure_reason: string | null;
  verify_reason: string | null;
  note: string | null;
  settlement_status: "unsettled" | "settled";
  settled_at: string | null;
  fee_actual_minor: number | null;
  bank_line_id: string | null;
  confirmed_at: string | null;
  confirmed_via: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface BankLineRow {
  id: string;
  statement_id: string;
  company_id: string;
  line_hash: string;
  value_date: string;
  reference: string;
  label: string;
  gross_minor: number;
  fee_minor: number;
  net_minor: number;
  match_status: "matched" | "unmatched" | "amount_mismatch" | "duplicate";
  payment_id: string | null;
}

export interface GateDeviceRow {
  id: string;
  company_id: string;
  name: string;
  active: number;
  created_at: string;
}

/** Count or sum returned by `SELECT … AS n`. */
export interface CountRow {
  n: number;
}

/** Chart of accounts and journals of a club (company settings, merged with the defaults). */
export interface ClubAccounting {
  accounts: {
    receivable: string;
    dues: string;
    fee: string;
    cash: string;
    bank: string;
    transit: string;
    fees: string;
    outlets: Record<string, string>;
  };
  journals: { sales: string; bank: string; cash: string };
}

export interface ClubSettings extends ClubAccounting {
  refPrefix: string;
  dueDays: number;
  reminders: { minAmountMinor: number; levels: number[] };
  gate: { minAmountMinor: number; flagAfterDays: number; denyAfterDays: number };
}

/** The parts of the company settings the club module reads. */
export interface CompanySettings {
  payments: {
    attemptMinutes: number;
    methods: { link: { enabled: boolean; merchantRef: string; feeBps: number | null } };
  };
  club: ClubSettings;
}

/** One line of an imported bank statement, as parsed by the bank connector. */
export interface ParsedBankLine {
  valueDate: string;
  reference: string;
  label: string;
  grossMinor: number;
  feeMinor: number;
  netMinor: number;
}

export interface LinkInitiateRequest {
  paymentId: string;
  idempotencyKey: string;
  companyId: string;
  merchantRef: string;
  amountMinor: number;
  currency: string;
  invoiceNumber: string;
  payUrl: string;
  expiresAt: Date;
}

/** The connectors (payment provider, bank, gate) the club module calls. */
export interface ClubConnectors {
  payments: {
    link: {
      initiate(request: LinkInitiateRequest): Promise<{ providerRef: string }>;
      queryStatus(providerRef: string): Promise<StatusReport>;
    };
  };
  bank: { parse(content: string): ParsedBankLine[] };
  access: {
    verifyRequest(
      rawBody: string,
      signature: string | undefined,
      deviceSecret: string,
      now: Date,
    ): { requestId: string; credential: string };
  };
}

/** Payment notification of a provider, already verified by its connector. */
export interface ProviderNotification {
  type: string;
  providerRef: string;
  amountMinor: number;
  currency: string;
  failureReason?: string;
}
