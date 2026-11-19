// Daily close: totals of a business day, frozen once finance closes it.
import type { SessionUser } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, type Row, all, get, run, transaction } from "../../core/db.ts";
import { ApiError } from "../../core/errors.ts";
import { newId } from "../../core/ids.ts";
import { businessDay, iso } from "../../core/time.ts";
import { dayBounds, isValidDay } from "./legacy-imports.ts";

export interface DayTotals {
  day: string;
  closed: { closed_at: string; closed_by: string | null } | null;
  invoiced: number;
  byMethod: Row[];
  failed: number;
  /** Attempts still pending, created up to the end of the day (whatever their creation day). */
  pending: number;
  toVerify: number;
  /** Finance exceptions open now (not limited to the day). */
  openExceptions: number;
  /** Accounting entries not synced yet (not limited to the day). */
  erpPending: number;
  outstanding: number;
}

/** Totals of a business day. Also the preview shown before closing it. */
export function getDayTotals(db: Db, companyId: string, day: string): DayTotals {
  if (!isValidDay(day)) throw new ApiError(400, "invalid_input", "Jour invalide.");
  const [start, end] = dayBounds(day);
  const count = (sql: string, ...params: string[]): number => get<{ n: number }>(db, sql, companyId, ...params)!.n;
  return {
    day,
    closed:
      get<{ closed_at: string; closed_by: string | null }>(
        db,
        "SELECT c.closed_at, u.name AS closed_by FROM daily_closes c LEFT JOIN users u ON u.id = c.closed_by WHERE c.company_id = ? AND c.day = ?",
        companyId,
        day,
      ) ?? null,
    invoiced: count("SELECT COALESCE(SUM(amount_minor), 0) AS n FROM invoices WHERE company_id = ? AND issued_at >= ? AND issued_at < ?", start, end),
    byMethod: all(
      db,
      `SELECT method, COUNT(*) AS count, SUM(amount_minor) AS confirmed_minor, SUM(refunded_minor) AS refunded_minor, SUM(fee_expected_minor) AS fee_expected_minor,
        SUM(CASE WHEN settlement_status = 'settled' THEN amount_minor - refunded_minor ELSE 0 END) AS settled_minor, SUM(COALESCE(fee_actual_minor, 0)) AS fee_actual_minor
      FROM payments WHERE company_id = ? AND status IN ('confirmed','refunded') AND confirmed_at >= ? AND confirmed_at < ? GROUP BY method ORDER BY method`,
      companyId,
      start,
      end,
    ),
    failed: count("SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'failed' AND created_at >= ? AND created_at < ?", start, end),
    pending: count("SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'pending' AND created_at < ?", end),
    toVerify: count("SELECT COUNT(*) AS n FROM payments WHERE company_id = ? AND status = 'to_verify' AND created_at < ?", end),
    openExceptions: count("SELECT COUNT(*) AS n FROM exceptions WHERE company_id = ? AND status = 'open' AND domain = 'finance'"),
    erpPending: count("SELECT COUNT(*) AS n FROM erp_entries WHERE company_id = ? AND status != 'synced'"),
    outstanding: count(
      "SELECT COALESCE(SUM(amount_minor - paid_minor + refunded_minor), 0) AS n FROM invoices WHERE company_id = ? AND issued_at >= ? AND issued_at < ? AND status NOT IN ('paid','refunded')",
      start,
      end,
    ),
  };
}

/**
 * Closes a business day. Refused while attempts are pending: their outcome would change the
 * totals. Attempts "to verify" do not block (they are counted in the totals).
 */
export function closeDay(db: Db, user: SessionUser, day: string, now: Date = new Date()): DayTotals {
  const companyId = user.companyId!;
  return transaction(db, () => {
    const totals = getDayTotals(db, companyId, day);
    // Lexicographic comparison of YYYY-MM-DD strings.
    if (day > businessDay(now)) throw new ApiError(400, "future_day", "Impossible de clôturer un jour à venir.");
    if (totals.closed) throw new ApiError(409, "already_closed", "Cette journée est déjà clôturée.");
    if (totals.pending) {
      throw new ApiError(409, "payments_pending", `${totals.pending} paiement(s) encore en attente : vérifiez leur statut avant de clôturer.`);
    }
    run(
      db,
      "INSERT INTO daily_closes (id, company_id, day, closed_by, closed_at, totals_json) VALUES (?,?,?,?,?,?)",
      newId("cls"),
      companyId,
      day,
      user.id,
      iso(now),
      JSON.stringify(totals),
    );
    recordAudit(
      db,
      user,
      "day.closed",
      "daily_close",
      day,
      { day, invoicedMinor: totals.invoiced, toVerify: totals.toVerify, openExceptions: totals.openExceptions },
      companyId,
      now,
    );
    return getDayTotals(db, companyId, day);
  });
}

export interface DailyCloseEntry {
  day: string;
  closed_at: string;
  totals_json: undefined;
  closed_by: string | null;
  totals: DayTotals;
}

/** Latest 60 closes, newest day first, with the totals frozen at closing time. */
export function listDailyCloses(db: Db, companyId: string): DailyCloseEntry[] {
  return all<{ day: string; closed_at: string; totals_json: string; closed_by: string | null }>(
    db,
    "SELECT c.day, c.closed_at, c.totals_json, u.name AS closed_by FROM daily_closes c LEFT JOIN users u ON u.id = c.closed_by WHERE c.company_id = ? ORDER BY c.day DESC LIMIT 60",
    companyId,
  ).map((close) => ({ ...close, totals_json: undefined, totals: JSON.parse(close.totals_json) as DayTotals }));
}
