// Audit log: every administrative or financial action is recorded with its actor.
import { type Db, run } from "./db.ts";
import { newId } from "./ids.ts";
import { iso } from "./time.ts";
import type { Actor } from "./actor.ts";

export function recordAudit(
  db: Db,
  actor: Actor,
  action: string,
  entity: string,
  entityId: string,
  details: unknown = {},
  companyId: string | null = actor.companyId ?? null,
  now: Date = new Date(),
): void {
  run(
    db,
    "INSERT INTO audit_log (id, at, actor, actor_role, company_id, action, entity, entity_id, details_json) VALUES (?,?,?,?,?,?,?,?,?)",
    newId("aud"),
    iso(now),
    actor.id,
    actor.role,
    companyId,
    action,
    entity,
    entityId,
    JSON.stringify(details),
  );
}
