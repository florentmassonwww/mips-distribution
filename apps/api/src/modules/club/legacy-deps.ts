// Typed bindings to helpers of modules not yet rewritten (distribution, connectors). The legacy
// files are plain JavaScript without declarations; this is the only place that sees them untyped.
// Namespace imports are resolved at call time, so the bindings stay valid whatever the load order.
import type { Db } from "../../core/db.ts";
import type { CompanySettings } from "./types.ts";
import * as m_connectors_index from "../connectors/index.ts";
import * as m_distribution_counters from "../distribution/counters.ts";
import * as m_distribution_exceptions from "../distribution/exceptions.ts";
import * as m_distribution_settings from "../distribution/settings.ts";

/** Sales outlets of a club (restaurant, bar, courts…), each with its own revenue account. */
export const OUTLETS: readonly string[] = m_distribution_settings.CLUB_OUTLETS;

/** Header line of a bank statement CSV. */
export const BANK_STATEMENT_HEADER: string = m_connectors_index.STATEMENT_HEADER;

/** Company settings merged with the defaults. */
export const loadSettings = (db: Db, companyId: string): CompanySettings => m_distribution_settings.readCompanySettings(db, companyId);

/** Next value of a company counter, formatted `PREFIX-000123`. */
export const nextNumber = (db: Db, companyId: string, counter: string, prefix: string): string =>
  m_distribution_counters.nextNumber(db, companyId, counter, prefix);

/** Opens an exception for the back office, unless one is already open for that type and entity. */
export const openException = (
  db: Db,
  companyId: string,
  domain: "ops" | "finance",
  type: string,
  entity: string,
  entityId: string,
  message: string,
  details: unknown,
  now: Date,
): void => m_distribution_exceptions.raiseException(db, companyId, domain, type, entity, entityId, message, details, now);

/** Resolves the open exceptions of these types on an entity. */
export const resolveExceptions = (
  db: Db,
  companyId: string,
  types: string[],
  entityId: string,
  note: string,
  now: Date,
): void => m_distribution_exceptions.autoResolveExceptions(db, companyId, types, entityId, note, now);

/** Queues an accounting entry for the ERP (ignored if one exists for that kind and entity). */
export const queueErpEntry = (
  db: Db,
  companyId: string,
  kind: string,
  entityId: string,
  label: string,
  amountMinor: number,
  payload: unknown,
  now: Date,
): void => m_distribution_exceptions.queueErpEntry(db, companyId, kind, entityId, label, amountMinor, payload, now);
