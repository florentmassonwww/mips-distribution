// Shapes of the club API answers, as far as the screens read them. Amounts are in minor units
// (cents of a rupee); dates are ISO strings.

export type Billing = "annual" | "monthly";
export type GateDecisionValue = "allow" | "flag" | "deny";

export interface MemberListItem {
  id: string;
  number: string;
  name: string;
  plan: string | null;
  status: string;
  reference: string;
  balance_minor: number;
  overdue_minor: number;
  overdue_days: number;
  last_reminder_level: number | null;
  last_reminder_at: string | null;
}

export interface ClubDashboardData {
  totals: { owedMinor: number; overdueMinor: number; creditMinor: number; members: number; inArrears: number };
  aging: Record<string, number>;
  collectedMonth: { method: string; amount_minor: number }[];
  unsettledOnlineMinor: number;
  gateToday: { allow: number; flag: number; deny: number };
  remindersMonth: number;
  openExceptions: number;
  generatedAt: string;
  topDebtors: MemberListItem[];
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  billing: Billing;
  fee_minor: number;
  active: number;
  members: number;
}

export interface DuesPeriod {
  period: string;
  billed_at: string;
  count: number;
  amount_minor: number;
  collected_minor: number;
}

export interface DuesData {
  plans: Plan[];
  periods: DuesPeriod[];
}

export interface GateOutcome {
  decision: GateDecisionValue;
  reason: string;
  overdueMinor: number;
  overdueDays: number;
}

export interface MemberCharge {
  id: string;
  number: string;
  kind: string;
  outlet: string;
  label: string;
  due_date: string;
  amount_minor: number;
  remaining_minor: number;
  status: string;
  cancel_reason: string | null;
  overdue: boolean;
}

export interface MemberPayment {
  id: string;
  created_at: string;
  method: string;
  amount_minor: number;
  status: string;
  confirmed_via: string | null;
  verify_reason: string | null;
  failure_reason: string | null;
  settlement_status: string;
  provider_ref: string | null;
}

export interface StatementLine {
  at: string;
  ref: string;
  label: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ReminderBase {
  id: string;
  level: number;
  channel: string;
  amount_minor: number;
  overdue_days: number;
  message: string;
  sent_at: string;
}

export interface GateEventBase {
  id: string;
  at: string;
  decision: GateDecisionValue;
  reason: string;
  source: string;
  overdue_minor: number;
  overdue_days: number;
}

export interface MemberDetailData {
  member: {
    id: string;
    number: string;
    name: string;
    status: string;
    reference: string;
    badge: string;
    joined_at: string;
    plan: { id: string; name: string; billing: Billing; fee_minor: number } | null;
  };
  account: {
    dueMinor: number;
    creditMinor: number;
    chargedMinor: number;
    paidMinor: number;
    overdueMinor: number;
    overdueDays: number;
  };
  portalPath: string;
  gate: GateOutcome;
  charges: MemberCharge[];
  payments: MemberPayment[];
  statement: StatementLine[];
  reminders: ReminderBase[];
  gateEvents: GateEventBase[];
}

/** Answer of "send the statement": the recorded message and the member's payment page. */
export interface SentStatement {
  message: string;
  url: string;
}

export interface Reminder extends ReminderBase {
  member_id: string;
  member_number: string;
  member: string;
  sent_by: string | null;
}

export interface MemberPaymentListItem extends MemberPayment {
  member_id: string;
  member_number: string;
  member: string;
  reference: string;
  fee_actual_minor: number | null;
}

export interface BankLine {
  id: string;
  value_date: string;
  reference: string;
  label: string;
  gross_minor: number;
  fee_minor: number;
  match_status: string;
  confirmed_via: string | null;
  member_id: string | null;
  member_number: string | null;
  member: string | null;
}

export interface UnsettledPayment {
  id: string;
  provider_ref: string;
  amount_minor: number;
  confirmed_at: string;
  member_number: string;
  member: string;
}

export interface ImportedStatement {
  id: string;
  imported_at: string;
  filename: string;
  imported_by_name: string | null;
  line_count: number;
  matched_count: number;
  skipped_count: number;
}

export interface ReconciliationData {
  lines: BankLine[];
  unsettled: UnsettledPayment[];
  statements: ImportedStatement[];
}

export interface AccountingLine {
  date: string;
  journal: string;
  account: string;
  aux: string;
  piece: string;
  label: string;
  debit: number;
  credit: number;
}

export interface AccountingData {
  totals: { debit: number; credit: number; balanced: boolean };
  lines: AccountingLine[];
}

export interface GateEvent extends GateEventBase {
  credential_hint: string;
  member_id: string | null;
  member_number: string | null;
  member: string | null;
  device: string | null;
}

export interface GateDevice {
  id: string;
  name: string;
  active: number;
}

export interface DeskCheck extends GateOutcome {
  member: {
    id: string;
    number: string;
    name: string;
    status: string;
    reference: string;
    portalPath: string;
  } | null;
}

export interface PortalData {
  club: string;
  number: string;
  firstName: string;
  reference: string;
  dueMinor: number;
  overdueMinor: number;
  overdueDays: number;
  creditMinor: number;
  demoMode: boolean;
  open: { label: string; dueDate: string; remainingMinor: number; overdue: boolean }[];
  lastPayment: { status: string; amountMinor: number; at: string } | null;
}
