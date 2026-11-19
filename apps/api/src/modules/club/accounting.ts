// Accounting: journal lines of charges, payments and online settlements, and the export over a
// period. The same lines are attached to the ERP entries when the events happen.
import { type Db, all, get } from "../../core/db.ts";
import { isClubOutlet, readCompanySettings as loadSettings } from "../distribution/settings.ts";
import type { ClubAccounting, MemberChargeRow, MemberPaymentRow, MemberRow } from "./types.ts";

export interface JournalLine {
  date: string;
  journal: string;
  account: string;
  /** Auxiliary (member) account, `M00012`, on receivable lines only. */
  aux: string;
  piece: string;
  label: string;
  debit: number;
  credit: number;
}

type MemberRef = Pick<MemberRow, "number" | "name">;

/** Revenue account of a charge: dues, fees, or the account of its outlet (unknown outlets go to "other"). */
function revenueAccount(club: ClubAccounting, charge: MemberChargeRow): string {
  if (charge.kind === "dues") return club.accounts.dues;
  if (charge.kind === "fee") return club.accounts.fee;
  return club.accounts.outlets[isClubOutlet(charge.outlet) ? charge.outlet : "other"]!;
}

/** Sales journal lines of a charge (receivable / revenue), or of its cancellation (reversed). */
export function chargeJournalLines(
  club: ClubAccounting,
  charge: MemberChargeRow,
  member: MemberRef,
  cancellation = false,
): JournalLine[] {
  const date = (cancellation ? charge.cancelled_at! : charge.created_at).slice(0, 10);
  const label = `${cancellation ? "Annulation " : ""}${charge.label} - ${member.name}`.slice(0, 80);
  const [debit, credit] = cancellation ? [0, charge.amount_minor] : [charge.amount_minor, 0];
  const common = { date, journal: club.journals.sales, piece: charge.number, label };
  return [
    { ...common, account: club.accounts.receivable, aux: `M${member.number}`, debit, credit },
    { ...common, account: revenueAccount(club, charge), aux: "", debit: credit, credit: debit },
  ].map(orderLine);
}

/** Lines of a payment received: cash journal for cash, bank journal otherwise (online payments go to a transit account until settled). */
export function paymentJournalLines(club: ClubAccounting, payment: MemberPaymentRow, member: MemberRef): JournalLine[] {
  const date = (payment.confirmed_at ?? payment.created_at).slice(0, 10);
  const journal = payment.method === "cash" ? club.journals.cash : club.journals.bank;
  const account =
    payment.method === "cash"
      ? club.accounts.cash
      : payment.method === "link"
        ? club.accounts.transit
        : club.accounts.bank;
  const piece = payment.provider_ref ?? payment.reference;
  const how = payment.method === "link" ? "en ligne" : payment.method === "cash" ? "espèces" : "virement";
  const label = `Encaissement ${how} - ${member.name}`.slice(0, 80);
  return [
    orderLine({ date, journal, account, aux: "", piece, label, debit: payment.amount_minor, credit: 0 }),
    orderLine({
      date,
      journal,
      account: club.accounts.receivable,
      aux: `M${member.number}`,
      piece,
      label,
      debit: 0,
      credit: payment.amount_minor,
    }),
  ];
}

/** Lines of the bank settlement of an online payment: net to the bank, provider fee (if any), out of transit. */
export function settlementJournalLines(club: ClubAccounting, payment: MemberPaymentRow): JournalLine[] {
  const date = payment.settled_at!.slice(0, 10);
  const fee = payment.fee_actual_minor ?? 0;
  const piece = payment.provider_ref!;
  const label = `Règlement paiement en ligne ${payment.provider_ref}`;
  const common = { date, journal: club.journals.bank, aux: "", piece, label };
  return [
    orderLine({ ...common, account: club.accounts.bank, debit: payment.amount_minor - fee, credit: 0 }),
    ...(fee ? [orderLine({ ...common, account: club.accounts.fees, debit: fee, credit: 0 })] : []),
    orderLine({ ...common, account: club.accounts.transit, debit: 0, credit: payment.amount_minor }),
  ];
}

/** Rebuilds a line with the keys in the order of the export (JSON output). */
const orderLine = (line: JournalLine): JournalLine => ({
  date: line.date,
  journal: line.journal,
  account: line.account,
  aux: line.aux,
  piece: line.piece,
  label: line.label,
  debit: line.debit,
  credit: line.credit,
});

export interface AccountingExport {
  from: string;
  to: string;
  lines: JournalLine[];
  totals: { debit: number; credit: number; balanced: boolean };
}

/** Journal lines of every event whose date falls between `from` and `to` (business days, inclusive). */
export function accountingExport(db: Db, companyId: string, from: string, to: string): AccountingExport {
  const club = loadSettings(db, companyId).club;
  const lines: JournalLine[] = [];
  const inPeriod = (at: string | null): boolean => !!at && at.slice(0, 10) >= from && at.slice(0, 10) <= to;
  const memberRef = (memberId: string): MemberRef =>
    get<MemberRef>(db, "SELECT number, name FROM members WHERE id = ?", memberId)!;

  const charges = all<MemberChargeRow>(db, "SELECT * FROM member_charges WHERE company_id = ? ORDER BY created_at, rowid", companyId);
  for (const charge of charges) {
    if (inPeriod(charge.created_at)) lines.push(...chargeJournalLines(club, charge, memberRef(charge.member_id)));
    if (charge.status === "cancelled" && inPeriod(charge.cancelled_at)) {
      lines.push(...chargeJournalLines(club, charge, memberRef(charge.member_id), true));
    }
  }
  const payments = all<MemberPaymentRow>(
    db,
    "SELECT * FROM member_payments WHERE company_id = ? AND status = 'confirmed' ORDER BY confirmed_at, rowid",
    companyId,
  );
  for (const payment of payments) {
    if (inPeriod(payment.confirmed_at)) lines.push(...paymentJournalLines(club, payment, memberRef(payment.member_id)));
    if (payment.method === "link" && payment.settlement_status === "settled" && inPeriod(payment.settled_at)) {
      lines.push(...settlementJournalLines(club, payment));
    }
  }
  // Stable sort: within a day and journal, lines keep the order of the events.
  lines.sort((a, b) => a.date.localeCompare(b.date) || a.journal.localeCompare(b.journal));
  const debit = lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = lines.reduce((sum, line) => sum + line.credit, 0);
  return { from, to, lines, totals: { debit, credit, balanced: debit === credit } };
}
