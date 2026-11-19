// Exceptions (anomalies to be handled by ops or finance) and the ERP entries queued for synchronisation.
import { type Db, all, get, run, transaction } from "../../core/db.ts";
import { newId } from "../../core/ids.ts";
import { iso } from "../../core/time.ts";
import { recordAudit } from "../../core/audit.ts";
import { ApiError, notFound } from "../../core/errors.ts";
import type { Actor } from "../../core/actor.ts";
import { requireCompanyId } from "./access.ts";

export type ExceptionDomain = "ops" | "finance";

export interface ExceptionRow {
  id: string;
  company_id: string;
  domain: ExceptionDomain;
  type: string;
  status: "open" | "resolved";
  entity: string;
  entity_id: string;
  message: string;
  details_json: string;
  created_at: string;
  resolution: string | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolved_by_name: string | null;
}

/** An exception as returned by the API: details parsed, raw JSON dropped. */
export type ExceptionView = Omit<ExceptionRow, "details_json"> & { details_json: undefined; details: unknown };

/**
 * Opens an exception, unless one of the same type is already open on the same entity: a recurring
 * anomaly stays a single item in the work queue.
 */
export function raiseException(
  db: Db,
  companyId: string,
  domain: ExceptionDomain,
  type: string,
  entity: string,
  entityId: string,
  message: string,
  details: unknown = {},
  now: Date = new Date(),
): void {
  const alreadyOpen = get(
    db,
    "SELECT 1 FROM exceptions WHERE company_id = ? AND type = ? AND entity_id = ? AND status = 'open'",
    companyId,
    type,
    entityId,
  );
  if (alreadyOpen) return;
  run(
    db,
    "INSERT INTO exceptions (id, company_id, domain, type, entity, entity_id, message, details_json, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    newId("exc"),
    companyId,
    domain,
    type,
    entity,
    entityId,
    message,
    JSON.stringify(details),
    iso(now),
  );
}

/** Closes the open exceptions of the given types on an entity once the system observes the issue is gone. */
export function autoResolveExceptions(
  db: Db,
  companyId: string,
  types: readonly string[],
  entityId: string,
  note: string,
  now: Date = new Date(),
): void {
  for (const type of types) {
    run(
      db,
      "UPDATE exceptions SET status = 'resolved', resolution = 'auto', resolution_note = ?, resolved_by = 'system', resolved_at = ? WHERE company_id = ? AND type = ? AND entity_id = ? AND status = 'open'",
      note,
      iso(now),
      companyId,
      type,
      entityId,
    );
  }
}

/** Queues an accounting entry for the ERP; an entity is exported at most once per kind. */
export function queueErpEntry(
  db: Db,
  companyId: string,
  kind: string,
  entityId: string,
  label: string,
  amountMinor: number,
  payload: unknown,
  now: Date = new Date(),
): void {
  run(
    db,
    "INSERT OR IGNORE INTO erp_entries (id, company_id, kind, entity_id, label, amount_minor, payload_json, created_at) VALUES (?,?,?,?,?,?,?,?)",
    newId("erp"),
    companyId,
    kind,
    entityId,
    label,
    amountMinor,
    JSON.stringify(payload),
    iso(now),
  );
}

export function listExceptions(db: Db, companyId: string, domain: ExceptionDomain, status: "open" | "resolved"): ExceptionView[] {
  return all<ExceptionRow>(
    db,
    `SELECT e.*, u.name AS resolved_by_name FROM exceptions e LEFT JOIN users u ON u.id = e.resolved_by
    WHERE e.company_id = ? AND e.domain = ? AND e.status = ? ORDER BY e.created_at DESC LIMIT 300`,
    companyId,
    domain,
    status,
  ).map((row) => ({ ...row, details_json: undefined, details: JSON.parse(row.details_json) }));
}

/** Manual decision on an open exception, by a user allowed to handle its domain. */
export function resolveException(
  db: Db,
  actor: Actor,
  exceptionId: string,
  allowedDomains: readonly string[],
  resolution: string,
  note: string,
  now: Date = new Date(),
): void {
  const companyId = requireCompanyId(actor);
  transaction(db, () => {
    const exception = get<Pick<ExceptionRow, "domain" | "type" | "status" | "message">>(
      db,
      "SELECT domain, type, status, message FROM exceptions WHERE id = ? AND company_id = ?",
      exceptionId,
      companyId,
    );
    if (!exception) throw notFound("Exception");
    if (!allowedDomains.includes(exception.domain)) throw new ApiError(403, "forbidden", "Accès non autorisé.");
    if (exception.status !== "open") throw new ApiError(409, "already_resolved", "Cette exception est déjà traitée.");
    // A payment under verification is settled by facts (provider status or bank statement), never by hand.
    if (exception.type === "payment_to_verify") {
      throw new ApiError(
        409,
        "needs_provider",
        "Un paiement à vérifier se lève par l'interrogation du prestataire ou par le relevé bancaire, pas par validation manuelle.",
      );
    }
    run(
      db,
      "UPDATE exceptions SET status = 'resolved', resolution = ?, resolution_note = ?, resolved_by = ?, resolved_at = ? WHERE id = ?",
      resolution,
      note,
      actor.id,
      iso(now),
      exceptionId,
    );
    recordAudit(db, actor, `exception.${resolution}`, "exception", exceptionId, { type: exception.type, message: exception.message, note }, companyId, now);
  });
}
