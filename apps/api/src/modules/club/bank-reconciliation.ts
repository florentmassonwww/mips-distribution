// Club bank statements: import, matching of each credit line, manual assignment of unidentified
// transfers, and the reconciliation overview. A line is matched either to an online payment by its
// provider reference (settlement), or to a member by the payment reference quoted on a transfer.
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { ApiError, notFound } from "../../core/errors.ts";
import { formatMinor } from "../../core/format.ts";
import { newId } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { settlementJournalLines } from "./accounting.ts";
import {
  BANK_STATEMENT_HEADER,
  loadSettings,
  openException,
  queueErpEntry,
  resolveExceptions,
} from "./legacy-deps.ts";
import { confirmMemberPayment, touchMemberPayment } from "./member-payments.ts";
import { listMembers } from "./members.ts";
import { findReference } from "./references.ts";
import { actorCompanyId, memberPaymentById, requireMember } from "./shared.ts";
import type { BankLineRow, ClubConnectors, MemberPaymentRow, MemberRow, ParsedBankLine } from "./types.ts";

export const importStatementInput = z.object({
  filename: z.string().min(1).max(120),
  content: z.string().min(10).max(2e6),
});

export const assignBankLineInput = z.object({
  memberId: z.string(),
  note: z.string().min(3).max(200),
});

/** Last word of a name, upper case, without a trailing "(…)" remark: how banks print the payer. */
const payerName = (name: string): string => name.replace(/\s*\(.*\)$/, "").split(" ").slice(-1)[0]!.toUpperCase();

/**
 * Demo statement for today: the settlement of every unsettled online payment (provider fee at the
 * configured rate), then transfers from the four oldest debtors showing each matching case: exact
 * reference, compact reference with a partial amount, wrong check digits, no reference at all.
 */
export function demoStatement(db: Db, companyId: string, now: Date = new Date()): string {
  const day = businessDay(now);
  const feeBps = loadSettings(db, companyId).payments.methods.link.feeBps;
  const settlements = all<MemberPaymentRow>(
    db,
    "SELECT * FROM member_payments WHERE company_id = ? AND method = 'link' AND status = 'confirmed' AND settlement_status = 'unsettled' ORDER BY confirmed_at",
    companyId,
  );
  const lines = settlements.map((payment) => {
    const fee = Math.round((payment.amount_minor * feeBps) / 1e4);
    return [
      day,
      payment.provider_ref,
      "REGLEMENT PAIEMENTS EN LIGNE",
      formatMinor(payment.amount_minor),
      formatMinor(fee),
      formatMinor(payment.amount_minor - fee),
    ].join(";");
  });
  const debtors = listMembers(db, companyId, now, { filter: "arrears", sort: "age" })
    .filter((member) => member.status === "active")
    .slice(0, 4);
  const transferRef = (index: number): string => `VIR-${day.replace(/-/g, "")}-${String(index + 1).padStart(2, "0")}`;
  debtors.forEach((member, index) => {
    // The second debtor pays only part of the overdue amount (rounded to the rupee, at least 1).
    const amount = index === 1 ? Math.max(100, Math.round(member.overdue_minor / 200) * 100) : member.overdue_minor;
    const [prefix, number, check] = member.reference.split("-") as [string, string, string];
    const wrongCheck = String((Number(check) + 1) % 100).padStart(2, "0");
    const label = [
      `VIREMENT ${member.reference} COTISATION`,
      `VIR ${member.reference.replace(/-/g, "")} ${payerName(member.name)}`,
      `VIREMENT ${prefix}-${number}-${wrongCheck} ${payerName(member.name)}`,
      `VIREMENT ${payerName(member.name)} COTISATION CLUB`,
    ][index];
    lines.push([day, transferRef(index), label, formatMinor(amount), "0.00", formatMinor(amount)].join(";"));
  });
  return [BANK_STATEMENT_HEADER, ...lines].join("\r\n") + "\r\n";
}

interface SettlementLine {
  id: string;
  feeMinor: number;
  valueDate: string;
}

/** Bank settlement of an online payment (confirming it first if the notification was missed). */
function settleOnlinePayment(db: Db, payment: MemberPaymentRow, line: SettlementLine, actor: Actor, now: Date): void {
  if (payment.status === "pending" || payment.status === "to_verify") {
    confirmMemberPayment(db, payment, "bank_statement", actor, now);
  }
  run(
    db,
    "UPDATE member_payments SET settlement_status = 'settled', settled_at = ?, fee_actual_minor = ?, bank_line_id = ? WHERE id = ?",
    iso(now),
    line.feeMinor,
    line.id,
    payment.id,
  );
  touchMemberPayment(db, payment.id, now);
  const settled = memberPaymentById(db, payment.id);
  queueErpEntry(
    db,
    payment.company_id,
    "settlement",
    payment.id,
    `Règlement bancaire ${payment.provider_ref}`,
    settled.amount_minor - line.feeMinor,
    {
      providerRef: payment.provider_ref,
      grossMinor: settled.amount_minor,
      feeMinor: line.feeMinor,
      valueDate: line.valueDate,
      lines: settlementJournalLines(loadSettings(db, payment.company_id).club, settled),
    },
    now,
  );
  recordAudit(
    db,
    actor,
    "member_payment.settled",
    "member_payment",
    payment.id,
    {
      amountMinor: settled.amount_minor,
      feeMinor: line.feeMinor,
      providerRef: payment.provider_ref,
      valueDate: line.valueDate,
    },
    payment.company_id,
    now,
  );
}

interface TransferLine {
  id: string;
  hash: string;
  grossMinor: number;
  feeMinor: number;
  reference: string;
}

/** Records a bank transfer from a member (already settled) and confirms it. Returns the payment id. */
function recordBankTransfer(
  db: Db,
  member: MemberRow,
  line: TransferLine,
  via: string,
  note: string,
  actor: Actor,
  now: Date,
): string {
  const id = newId("mpay");
  run(
    db,
    `INSERT INTO member_payments (id, company_id, member_id, method, amount_minor, currency, status, idempotency_key, reference, note, settlement_status, settled_at, fee_actual_minor, bank_line_id, created_by, created_at, updated_at)
    VALUES (?,?,?,'bank_transfer',?,?,'pending',?,?,?,'settled',?,?,?,?,?,?)`,
    id,
    member.company_id,
    member.id,
    line.grossMinor,
    "MUR",
    // The line hash makes the import idempotent even if the same line is assigned again.
    `bank:${line.hash}`,
    line.reference,
    note,
    iso(now),
    line.feeMinor,
    line.id,
    actor.id,
    iso(now),
    iso(now),
  );
  confirmMemberPayment(db, memberPaymentById(db, id), via, actor, now);
  return id;
}

type MatchStatus = BankLineRow["match_status"];

/** Identity of a statement line: a line already imported (same fields) is skipped. */
const lineHash = (line: ParsedBankLine): string =>
  createHash("sha256")
    .update([line.valueDate, line.reference, line.label, line.grossMinor, line.feeMinor].join("|"))
    .digest("hex");

export interface StatementImportResult {
  statementId: string;
  lines: number;
  matched: number;
  exceptions: number;
  skipped: number;
}

/** Imports a bank statement: every new line is matched or becomes an exception for the finance team. */
export function importStatement(
  db: Db,
  connectors: ClubConnectors,
  actor: Actor,
  filename: string,
  content: string,
  now: Date = new Date(),
): StatementImportResult {
  const companyId = actorCompanyId(actor);
  const parsed = connectors.bank.parse(content);
  if (!parsed.length) throw new ApiError(400, "bad_statement", "Le relevé ne contient aucune ligne.");
  const refPrefix = loadSettings(db, companyId).club.refPrefix;
  return transaction(db, () => {
    const statementId = newId("stm");
    run(
      db,
      "INSERT INTO bank_statements (id, company_id, filename, imported_by, imported_at, line_count, matched_count, skipped_count) VALUES (?,?,?,?,?,0,0,0)",
      statementId,
      companyId,
      filename.slice(0, 120),
      actor.id,
      iso(now),
    );
    const counts = { matched: 0, exceptions: 0, skipped: 0 };
    for (const line of parsed) {
      const hash = lineHash(line);
      if (get(db, "SELECT 1 FROM bank_lines WHERE company_id = ? AND line_hash = ?", companyId, hash)) {
        counts.skipped++;
        continue;
      }
      const lineId = newId("bl");
      let status: MatchStatus = "unmatched";
      let paymentId: string | null = null;
      const exception = (type: string, message: string, details: unknown): void =>
        openException(db, companyId, "finance", type, "bank_line", lineId, message, details, now);

      const online = get<MemberPaymentRow>(
        db,
        "SELECT * FROM member_payments WHERE company_id = ? AND provider_ref = ?",
        companyId,
        line.reference,
      );
      if (online) {
        paymentId = online.id;
        if (online.settlement_status === "settled") {
          status = "duplicate";
          exception("duplicate_settlement", `Référence ${line.reference} créditée une seconde fois sur le relevé.`, {
            reference: line.reference,
            grossMinor: line.grossMinor,
          });
        } else if (online.status === "failed") {
          // Status stays "unmatched": the money arrived for a payment recorded as failed.
          exception(
            "credit_on_failed",
            `Crédit reçu pour ${line.reference}, enregistré comme échoué : à contrôler avec le prestataire.`,
            { reference: line.reference, grossMinor: line.grossMinor, paymentId: online.id },
          );
        } else if (line.grossMinor === online.amount_minor) {
          status = "matched";
          settleOnlinePayment(db, online, { id: lineId, feeMinor: line.feeMinor, valueDate: line.valueDate }, actor, now);
        } else {
          status = "amount_mismatch";
          exception(
            "settlement_amount_mismatch",
            `Écart de montant sur ${line.reference} : ${formatMinor(line.grossMinor)} crédité pour ${formatMinor(online.amount_minor)} attendu.`,
            {
              reference: line.reference,
              creditedMinor: line.grossMinor,
              expectedMinor: online.amount_minor,
              paymentId: online.id,
            },
          );
        }
      } else if (line.grossMinor > 0) {
        const found = findReference(`${line.reference} ${line.label}`, refPrefix);
        const member = found?.valid
          ? get<MemberRow>(db, "SELECT * FROM members WHERE company_id = ? AND number = ?", companyId, found.number)
          : undefined;
        if (member) {
          status = "matched";
          paymentId = recordBankTransfer(
            db,
            member,
            { id: lineId, hash, grossMinor: line.grossMinor, feeMinor: line.feeMinor, reference: member.reference },
            "bank_statement",
            line.label,
            actor,
            now,
          );
        } else if (found) {
          exception(
            "reference_invalid",
            `Virement de ${formatMinor(line.grossMinor)} avec une référence incorrecte (${found.raw}) : clé de contrôle fausse ou membre inconnu. À affecter à la main.`,
            { reference: found.raw, grossMinor: line.grossMinor, label: line.label, valueDate: line.valueDate },
          );
        } else {
          exception(
            "unidentified_transfer",
            `Virement de ${formatMinor(line.grossMinor)} sans référence de membre (« ${line.label} ») : à affecter à la main.`,
            { grossMinor: line.grossMinor, label: line.label, valueDate: line.valueDate },
          );
        }
      } else {
        exception(
          "unknown_credit",
          `Ligne de relevé sans correspondance : ${line.reference} (${formatMinor(line.grossMinor)}).`,
          { reference: line.reference, grossMinor: line.grossMinor },
        );
      }

      if (status === "matched") counts.matched++;
      else counts.exceptions++;
      run(
        db,
        "INSERT INTO bank_lines (id, statement_id, company_id, line_hash, value_date, reference, label, gross_minor, fee_minor, net_minor, match_status, payment_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        lineId,
        statementId,
        companyId,
        hash,
        line.valueDate,
        line.reference,
        line.label,
        line.grossMinor,
        line.feeMinor,
        line.netMinor,
        status,
        paymentId,
      );
    }
    run(
      db,
      "UPDATE bank_statements SET line_count = ?, matched_count = ?, skipped_count = ? WHERE id = ?",
      parsed.length - counts.skipped,
      counts.matched,
      counts.skipped,
      statementId,
    );
    recordAudit(
      db,
      actor,
      "statement.imported",
      "bank_statement",
      statementId,
      { filename, lines: parsed.length, ...counts },
      companyId,
      now,
    );
    return { statementId, lines: parsed.length, ...counts };
  });
}

/** Assigns an unidentified transfer to a member by hand: recorded as a confirmed bank transfer. */
export function assignBankLine(
  db: Db,
  actor: Actor,
  lineId: string,
  memberId: string,
  note: string,
  now: Date = new Date(),
): { paymentId: string } {
  const companyId = actorCompanyId(actor);
  return transaction(db, () => {
    const line = get<BankLineRow>(db, "SELECT * FROM bank_lines WHERE id = ? AND company_id = ?", lineId, companyId);
    if (!line) throw notFound("Ligne de relevé");
    if (line.match_status !== "unmatched" || line.payment_id || line.gross_minor <= 0) {
      throw new ApiError(409, "bad_status", "Seul un virement non identifié peut être affecté à un membre.");
    }
    const member = requireMember(db, companyId, memberId);
    const paymentId = recordBankTransfer(
      db,
      member,
      {
        id: line.id,
        hash: line.line_hash,
        grossMinor: line.gross_minor,
        feeMinor: line.fee_minor,
        reference: member.reference,
      },
      "manual_assignment",
      `${line.label} - ${note}`,
      actor,
      now,
    );
    run(db, "UPDATE bank_lines SET match_status = 'matched', payment_id = ? WHERE id = ?", paymentId, line.id);
    resolveExceptions(
      db,
      companyId,
      ["unidentified_transfer", "reference_invalid"],
      line.id,
      `Affecté au membre ${member.number}.`,
      now,
    );
    recordAudit(
      db,
      actor,
      "bank_line.assigned",
      "bank_line",
      line.id,
      { member: member.number, amountMinor: line.gross_minor, label: line.label, note },
      companyId,
      now,
    );
    return { paymentId };
  });
}

/** Latest statements and lines, and the online payments still waiting for their bank settlement. */
export const reconciliationOverview = (db: Db, companyId: string) => ({
  statements: all(
    db,
    "SELECT s.*, u.name AS imported_by_name FROM bank_statements s LEFT JOIN users u ON u.id = s.imported_by WHERE s.company_id = ? ORDER BY s.imported_at DESC LIMIT 30",
    companyId,
  ),
  lines: all(
    db,
    `SELECT b.id, b.value_date, b.reference, b.label, b.gross_minor, b.fee_minor, b.net_minor, b.match_status, p.method, p.confirmed_via, m.id AS member_id, m.number AS member_number, m.name AS member
    FROM bank_lines b LEFT JOIN member_payments p ON p.id = b.payment_id LEFT JOIN members m ON m.id = p.member_id WHERE b.company_id = ? ORDER BY b.rowid DESC LIMIT 300`,
    companyId,
  ),
  unsettled: all(
    db,
    `SELECT p.id, p.provider_ref, p.amount_minor, p.confirmed_at, m.number AS member_number, m.name AS member FROM member_payments p JOIN members m ON m.id = p.member_id
    WHERE p.company_id = ? AND p.method = 'link' AND p.status = 'confirmed' AND p.settlement_status = 'unsettled' ORDER BY p.confirmed_at`,
    companyId,
  ),
});
