// Sites of a company: its own stores, warehouses and depots (not its customers' outlets).
import { z } from "zod";
import type { Actor } from "./actor.ts";
import { recordAudit } from "./audit.ts";
import { type Db, all, get, run, transaction } from "./db.ts";
import { ApiError, notFound } from "./errors.ts";
import { newId } from "./ids.ts";
import { iso } from "./time.ts";

export const SITE_TYPES = ["store", "warehouse", "depot"] as const;
export const SITE_STATUSES = ["active", "inactive"] as const;
export const DEFAULT_TIMEZONE = "Indian/Mauritius";

export interface Site {
  id: string;
  type: (typeof SITE_TYPES)[number];
  parent_site_id: string | null;
  code: string;
  name: string;
  address: string;
  timezone: string;
  status: (typeof SITE_STATUSES)[number];
  created_at: string;
}

const SITE_COLUMNS = "id, type, parent_site_id, code, name, address, timezone, status, created_at";

const isTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

/** Site code: letters, digits and dashes, stored upper case; unique within the company. */
const codeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,19}$/)
  .transform((code) => code.toUpperCase());

const fields = {
  type: z.enum(SITE_TYPES),
  parentSiteId: z.string().min(1).nullable(),
  code: codeSchema,
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200),
  timezone: z.string().refine(isTimezone, "fuseau horaire inconnu"),
  status: z.enum(SITE_STATUSES),
};

export const newSiteSchema = z.object({
  type: fields.type,
  parentSiteId: fields.parentSiteId.default(null),
  code: fields.code,
  name: fields.name,
  address: fields.address.default(""),
  timezone: fields.timezone.default(DEFAULT_TIMEZONE),
  status: fields.status.default("active"),
});
export const siteChangesSchema = z.object(fields).partial();

export type NewSite = z.output<typeof newSiteSchema>;
export type SiteChanges = z.output<typeof siteChangesSchema>;

export function listSites(db: Db, companyId: string): Site[] {
  return all<Site>(db, `SELECT ${SITE_COLUMNS} FROM sites WHERE company_id = ? ORDER BY rowid`, companyId);
}

const siteOf = (db: Db, companyId: string, siteId: string): Site | undefined =>
  get<Site>(db, `SELECT ${SITE_COLUMNS} FROM sites WHERE id = ? AND company_id = ?`, siteId, companyId);

function assertCodeFree(db: Db, companyId: string, code: string, exceptSiteId?: string): void {
  if (get(db, "SELECT 1 FROM sites WHERE company_id = ? AND code = ? AND id != ?", companyId, code, exceptSiteId ?? "")) {
    throw new ApiError(409, "site_code_taken", "Ce code d'établissement est déjà utilisé.");
  }
}

/** The parent must be a site of the same company and, on a change, not the site itself or one of its descendants. */
function assertParent(db: Db, companyId: string, parentId: string | null, siteId?: string): void {
  if (parentId === null) return;
  if (!siteOf(db, companyId, parentId)) {
    throw new ApiError(400, "invalid_parent", "Établissement parent introuvable dans cette entreprise.");
  }
  for (let ancestor: string | null = parentId; ancestor !== null; ancestor = siteOf(db, companyId, ancestor)?.parent_site_id ?? null) {
    if (ancestor === siteId) throw new ApiError(400, "invalid_parent", "Un établissement ne peut pas dépendre de lui-même.");
  }
}

export function createSite(db: Db, actor: Actor, companyId: string, input: NewSite, now: Date): Site {
  assertCodeFree(db, companyId, input.code);
  assertParent(db, companyId, input.parentSiteId);
  const siteId = newId("site");
  return transaction(db, () => {
    run(
      db,
      "INSERT INTO sites (id, company_id, type, parent_site_id, code, name, address, timezone, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      siteId,
      companyId,
      input.type,
      input.parentSiteId,
      input.code,
      input.name,
      input.address,
      input.timezone,
      input.status,
      iso(now),
    );
    recordAudit(db, actor, "site.created", "site", siteId, { code: input.code, name: input.name, type: input.type }, companyId, now);
    return siteOf(db, companyId, siteId)!;
  });
}

export function updateSite(db: Db, actor: Actor, companyId: string, siteId: string, changes: SiteChanges, now: Date): Site {
  const site = siteOf(db, companyId, siteId);
  if (!site) throw notFound("Établissement");
  if (changes.code !== undefined) assertCodeFree(db, companyId, changes.code, siteId);
  if (changes.parentSiteId !== undefined) assertParent(db, companyId, changes.parentSiteId, siteId);
  const columns: [keyof SiteChanges, string][] = [
    ["type", "type"],
    ["parentSiteId", "parent_site_id"],
    ["code", "code"],
    ["name", "name"],
    ["address", "address"],
    ["timezone", "timezone"],
    ["status", "status"],
  ];
  return transaction(db, () => {
    for (const [field, column] of columns) {
      if (changes[field] !== undefined) run(db, `UPDATE sites SET ${column} = ? WHERE id = ?`, changes[field], siteId);
    }
    recordAudit(db, actor, "site.updated", "site", siteId, { code: site.code, ...changes }, companyId, now);
    return siteOf(db, companyId, siteId)!;
  });
}
