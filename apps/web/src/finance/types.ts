// Shapes of the finance API responses, as far as these screens read them.
// Amounts are in minor units (cents of a rupee); dates are ISO strings, days are YYYY-MM-DD.

/** One payment attempt in the transaction journal. */
export interface JournalEntry {
  id: string;
  order_id: string;
  created_at: string;
  invoice: string;
  customer: string;
  agent: string | null;
  method: string;
  amount_minor: number;
  refunded_minor: number;
  status: string;
  confirmed_via: string | null;
  failure_reason: string | null;
  verify_reason: string | null;
  settlement_status: string;
  fee_expected_minor: number;
  /** 0 when the fee was to be agreed: fee_expected_minor (0) is then not an expectation. */
  fee_expected_known: number;
  fee_actual_minor: number | null;
  provider_ref: string | null;
  confirmed_at: string | null;
}

export interface Invoice {
  id: string;
  order_id: string;
  number: string;
  order_number: string;
  issued_at: string;
  customer: string;
  route: string | null;
  amount_minor: number;
  paid_minor: number;
  refunded_minor: number;
  settled_minor: number;
  status: string;
  erp_status: string | null;
}

export interface ReconciliationData {
  /** Payments confirmed by the provider but not yet found on a bank statement. */
  unsettled: {
    id: string;
    confirmed_at: string;
    invoice: string;
    method: string;
    amount_minor: number;
    provider_ref: string;
  }[];
  lines: {
    id: string;
    value_date: string;
    reference: string;
    label: string;
    gross_minor: number;
    fee_minor: number;
    fee_expected_minor: number | null;
    /** 0 when the matched payment's fee is to be agreed; null for an unmatched line. */
    fee_expected_known: number | null;
    net_minor: number;
    match_status: string;
    invoice: string | null;
  }[];
  statements: {
    id: string;
    imported_at: string;
    filename: string;
    imported_by_name: string | null;
    line_count: number;
    matched_count: number;
    skipped_count: number;
  }[];
}

export interface DayTotals {
  invoiced: number;
  outstanding: number;
  toVerify: number;
  openExceptions: number;
}

export interface DailyCloseData {
  preview: {
    day: string;
    closed: { closed_at: string; closed_by: string | null } | null;
    /** Payments still pending: they block the close. */
    pending: number;
    toVerify: number;
    openExceptions: number;
    erpPending: number;
    failed: number;
    invoiced: number;
    outstanding: number;
    byMethod: {
      method: string;
      count: number;
      confirmed_minor: number;
      refunded_minor: number;
      fee_expected_minor: number;
      settled_minor: number;
      fee_actual_minor: number;
    }[];
  };
  closes: { day: string; closed_at: string; closed_by: string | null; totals: DayTotals }[];
}

export interface AccountingEntriesData {
  settings: { system: string; autoSync: boolean; simulateFailure: boolean };
  entries: {
    id: string;
    created_at: string;
    kind: string;
    label: string;
    amount_minor: number;
    status: string;
    last_error: string | null;
    attempts: number;
    external_ref: string | null;
  }[];
}
