// Accounting entries queued for the accounting software (ERP), and their synchronization.
import type { Actor } from "../../core/actor.ts";
import { recordAudit } from "../../core/audit.ts";
import { type Db, type Row, all, run } from "../../core/db.ts";
import { iso } from "../../core/time.ts";
import type { ConnectorSet } from "../connectors/index.ts";
import { autoResolveExceptions as resolveExceptions, raiseException as openException } from "../distribution/exceptions.ts";
import { readCompanySettings as companySettings } from "../distribution/settings.ts";

interface ErpEntryRow {
  id: string;
  company_id: string;
  kind: string;
  entity_id: string;
  label: string;
  amount_minor: number;
  payload_json: string;
  status: "pending" | "synced" | "failed";
  attempts: number;
  last_error: string | null;
  external_ref: string | null;
  created_at: string;
  synced_at: string | null;
}

/** Latest 400 entries, newest first. */
export function listAccountingEntries(db: Db, companyId: string): Row[] {
  return all(
    db,
    "SELECT id, kind, entity_id, label, amount_minor, status, attempts, last_error, external_ref, created_at, synced_at FROM erp_entries WHERE company_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 400",
    companyId,
  );
}

export interface SyncOptions {
  /** Also retry entries whose last push failed (implied when `ids` is given). */
  retryFailed?: boolean;
  /** Only these entries. */
  ids?: string[];
}

export interface SyncResult {
  synced: number;
  failed: number;
}

/**
 * Pushes the pending entries (oldest first, at most 200 per run), one at a time. A failed push is
 * recorded on the entry with an exception, and retried by a later explicit sync. The run is
 * audited only when an actor triggered it and there was something to push.
 */
export async function syncAccountingEntries(
  db: Db,
  connectors: ConnectorSet,
  companyId: string,
  options: SyncOptions = {},
  actor?: Actor,
  now: Date = new Date(),
): Promise<SyncResult> {
  const settings = companySettings(db, companyId).erp;
  const statuses = options.retryFailed || options.ids ? "'pending','failed'" : "'pending'";
  const entries = all<ErpEntryRow>(
    db,
    `SELECT * FROM erp_entries WHERE company_id = ? AND status IN (${statuses}) ORDER BY created_at, rowid LIMIT 200`,
    companyId,
  ).filter((entry) => !options.ids || options.ids.includes(entry.id));
  const result: SyncResult = { synced: 0, failed: 0 };

  for (const entry of entries) {
    try {
      const { externalRef } = await connectors.erp.push(
        {
          id: entry.id,
          kind: entry.kind,
          companyId,
          entityId: entry.entity_id,
          label: entry.label,
          amountMinor: entry.amount_minor,
          payload: JSON.parse(entry.payload_json),
        },
        settings,
      );
      run(
        db,
        "UPDATE erp_entries SET status = 'synced', attempts = attempts + 1, last_error = NULL, external_ref = ?, synced_at = ? WHERE id = ?",
        externalRef,
        iso(now),
        entry.id,
      );
      resolveExceptions(db, companyId, ["erp_sync_failed"], entry.id, "Écriture synchronisée.", now);
      result.synced++;
    } catch (error) {
      const message = (error instanceof Error ? error.message : "Erreur inconnue").slice(0, 300);
      run(db, "UPDATE erp_entries SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?", message, entry.id);
      openException(db, companyId, "finance", "erp_sync_failed", "erp_entry", entry.id, `Écriture ERP en erreur : ${entry.label}.`, { error: message }, now);
      result.failed++;
    }
  }
  if (actor && entries.length) {
    // The audit entity id is null for a sync run (the core helper's type requires a string).
    recordAudit(db, actor, "erp.sync", "erp", null as unknown as string, result, companyId, now);
  }
  return result;
}
