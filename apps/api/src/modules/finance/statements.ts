// Bank statements: demo statement generation, and import with matching against payments.
import { type LineException, type LineMatch, expectedFee, isFeeVariance, matchStatementLine } from "@mips/core";
import { createHash } from "node:crypto";
import { type Actor, companyOf } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { ApiError } from "../../core/errors.ts";
import { formatMinor } from "../../core/format.ts";
import { newId } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { type ConnectorSet, type StatementLine, STATEMENT_HEADER } from "../connectors/index.ts";
import { settlePayment } from "../payments/index.ts";
import type { PaymentRow } from "../payments/types.ts";
import { raiseException as openException } from "../distribution/exceptions.ts";
import { readCompanySettings as companySettings } from "../distribution/settings.ts";

/** Amount deliberately skimmed from the second line of a statement with anomalies (100.00). */
const ANOMALY_SHORT_CREDIT_MINOR = 10_000;
/** Extra fee deliberately charged on the first line of a statement with anomalies (5.00). */
const ANOMALY_EXTRA_FEE_MINOR = 500;

/**
 * Demo statement (CSV) that settles the company's confirmed, unsettled payments today, with the
 * expected fees (none while a fee is to be agreed). With `withAnomalies` (and at least 3 payments): a fee variance on the first
 * line, a short credit on the second, and a credit without reference.
 */
export function generateDemoStatement(db: Db, companyId: string, withAnomalies: boolean, now: Date = new Date()): string {
  // A payment "to verify" that the provider actually received is settled too: the statement is
  // what resolves it.
  const payments = all<PaymentRow>(
    db,
    `SELECT p.* FROM payments p LEFT JOIN demo_provider_tx d ON d.provider_ref = p.provider_ref
    WHERE p.company_id = ? AND p.settlement_status = 'unsettled' AND p.amount_minor > p.refunded_minor
      AND (p.status = 'confirmed' OR (p.status = 'to_verify' AND d.status = 'succeeded')) ORDER BY p.created_at`,
    companyId,
  );
  const methods = companySettings(db, companyId).payments.methods;
  const day = businessDay(now);
  const anomalies = withAnomalies && payments.length >= 3;
  const lines = payments.map((payment, index) => {
    let gross = payment.amount_minor - payment.refunded_minor;
    // The expected fee is computed on the full amount, refunds included.
    let fee = expectedFee(payment.amount_minor, methods[payment.method].feeBps).minor;
    if (anomalies && index === 0) fee += ANOMALY_EXTRA_FEE_MINOR;
    if (anomalies && index === 1) gross -= ANOMALY_SHORT_CREDIT_MINOR;
    return [day, payment.provider_ref, `REGLEMENT ${payment.method.toUpperCase()}`, formatMinor(gross), formatMinor(fee), formatMinor(gross - fee)].join(";");
  });
  if (withAnomalies) {
    lines.push([day, `VIR-INCONNU-${day.replace(/-/g, "")}`, "VIREMENT RECU SANS REFERENCE", "1250.00", "0.00", "1250.00"].join(";"));
  }
  return [STATEMENT_HEADER, ...lines].join("\r\n") + "\r\n";
}

type MatchStatus = LineMatch;

export interface ImportCounts {
  matched: number;
  exceptions: number;
  skipped: number;
}

export interface ImportResult extends ImportCounts {
  statementId: string;
  lines: number;
}

/** Same date, reference and amounts: the same bank line, already imported (overlapping statements). */
const lineHash = (line: StatementLine): string =>
  createHash("sha256").update([line.valueDate, line.reference, line.grossMinor, line.feeMinor].join("|")).digest("hex");

/** Matches one new bank line against the payment with its reference; opens an exception otherwise. */
function matchLine(
  db: Db,
  user: Actor,
  companyId: string,
  line: StatementLine,
  bankLineId: string,
  payment: PaymentRow | undefined,
  now: Date,
): MatchStatus {
  const ref = line.reference;
  const decision = matchStatementLine(
    line.grossMinor,
    payment && { status: payment.status, settlement: payment.settlement_status, amountMinor: payment.amount_minor, refundedMinor: payment.refunded_minor },
  );
  if (decision.match !== "matched") {
    const expectedMinor = payment ? payment.amount_minor - payment.refunded_minor : 0;
    const exceptions: Record<LineException, [string, Record<string, unknown>]> = {
      unknown_credit: [`Crédit bancaire sans paiement correspondant : ${ref} (${formatMinor(line.grossMinor)}).`, { reference: ref, grossMinor: line.grossMinor, valueDate: line.valueDate }],
      duplicate_settlement: [`Référence ${ref} créditée une seconde fois sur le relevé.`, { reference: ref, grossMinor: line.grossMinor }],
      credit_on_failed: [
        `Crédit reçu pour ${ref}, enregistré comme échoué : à contrôler avec le prestataire.`,
        { reference: ref, grossMinor: line.grossMinor, paymentId: payment?.id },
      ],
      settlement_amount_mismatch: [
        `Écart de montant sur ${ref} : ${formatMinor(line.grossMinor)} crédité pour ${formatMinor(expectedMinor)} attendu.`,
        { reference: ref, creditedMinor: line.grossMinor, expectedMinor, paymentId: payment?.id },
      ],
    };
    const [message, details] = exceptions[decision.exception];
    openException(db, companyId, "finance", decision.exception, "bank_line", bankLineId, message, details, now);
    return decision.match;
  }
  // A match always has its payment.
  const matched = payment!;

  settlePayment(db, matched, { id: bankLineId, feeMinor: line.feeMinor, valueDate: line.valueDate }, user, now);
  // Read after settlement: a payment confirmed by this very line just got its expected fee.
  const expected = get<{ fee_expected_minor: number; fee_expected_known: number }>(
    db,
    "SELECT fee_expected_minor, fee_expected_known FROM payments WHERE id = ?",
    matched.id,
  )!;
  const expectedFeeMinor = expected.fee_expected_minor;
  // A fee variance does not prevent the match. A fee still to be agreed has no expected amount.
  if (isFeeVariance(line.feeMinor, { minor: expectedFeeMinor, known: !!expected.fee_expected_known })) {
    openException(
      db,
      companyId,
      "finance",
      "fee_variance",
      "bank_line",
      bankLineId,
      `Écart de frais sur ${ref} : ${formatMinor(line.feeMinor)} prélevé pour ${formatMinor(expectedFeeMinor)} attendu.`,
      { reference: ref, feeMinor: line.feeMinor, expectedMinor: expectedFeeMinor, paymentId: matched.id },
      now,
    );
  }
  return "matched";
}

/** Imports a bank statement: each new line is matched by provider reference; lines already imported are skipped. */
export function importStatement(
  db: Db,
  connectors: ConnectorSet,
  user: Actor,
  filename: string,
  content: string,
  now: Date = new Date(),
): ImportResult {
  const companyId = companyOf(user)!;
  const lines = connectors.bank.parse(content);
  if (!lines.length) throw new ApiError(400, "bad_statement", "Le relevé ne contient aucune ligne.");

  return transaction(db, () => {
    const statementId = newId("stm");
    run(
      db,
      "INSERT INTO bank_statements (id, company_id, filename, imported_by, imported_at, line_count, matched_count, skipped_count) VALUES (?,?,?,?,?,0,0,0)",
      statementId,
      companyId,
      filename.slice(0, 120),
      user.id,
      iso(now),
    );
    const counts: ImportCounts = { matched: 0, exceptions: 0, skipped: 0 };
    for (const line of lines) {
      const hash = lineHash(line);
      if (get(db, "SELECT 1 FROM bank_lines WHERE company_id = ? AND line_hash = ?", companyId, hash)) {
        counts.skipped++;
        continue;
      }
      // Random draw before matching: the exceptions reference the bank line id.
      const bankLineId = newId("bl");
      const payment = get<PaymentRow>(db, "SELECT * FROM payments WHERE company_id = ? AND provider_ref = ?", companyId, line.reference);
      const status = matchLine(db, user, companyId, line, bankLineId, payment, now);
      if (status === "matched") counts.matched++;
      else counts.exceptions++;
      run(
        db,
        "INSERT INTO bank_lines (id, statement_id, company_id, line_hash, value_date, reference, label, gross_minor, fee_minor, net_minor, match_status, payment_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        bankLineId,
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
        payment?.id ?? null,
      );
    }
    run(
      db,
      "UPDATE bank_statements SET line_count = ?, matched_count = ?, skipped_count = ? WHERE id = ?",
      lines.length - counts.skipped,
      counts.matched,
      counts.skipped,
      statementId,
    );
    recordAudit(db, user, "statement.imported", "bank_statement", statementId, { filename, lines: lines.length, ...counts }, companyId, now);
    return { statementId, lines: lines.length, ...counts };
  });
}
