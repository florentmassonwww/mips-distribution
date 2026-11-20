// Business modules a company subscribes to. A row in company_modules means the module is active;
// deactivating a module removes the row and keeps every business record.
import { type Db, all, run } from "./db.ts";
import { iso } from "./time.ts";

/** Module catalogue, in display order. The CHECK constraint of company_modules mirrors it. */
export const MODULES = ["distribution", "club"] as const;
export type ModuleCode = (typeof MODULES)[number];

/** Display names, used in the refusal message of a module route. */
export const MODULE_NAMES: Record<ModuleCode, string> = { distribution: "Distribution", club: "Club" };

export const isModuleCode = (value: string): value is ModuleCode => (MODULES as readonly string[]).includes(value);

/** Sorts module codes in catalogue order. */
export const inCatalogueOrder = (modules: readonly ModuleCode[]): ModuleCode[] =>
  MODULES.filter((module) => modules.includes(module));

/** Active modules of a company, in catalogue order (none for a platform user). */
export function companyModules(db: Db, companyId: string | null): ModuleCode[] {
  if (!companyId) return [];
  const rows = all<{ module: ModuleCode }>(db, "SELECT module FROM company_modules WHERE company_id = ?", companyId);
  return inCatalogueOrder(rows.map((row) => row.module));
}

/** Active modules of every company, keyed by company id. */
export function modulesByCompany(db: Db): Map<string, ModuleCode[]> {
  const byCompany = new Map<string, ModuleCode[]>();
  for (const row of all<{ company_id: string; module: ModuleCode }>(db, "SELECT company_id, module FROM company_modules")) {
    byCompany.set(row.company_id, [...(byCompany.get(row.company_id) ?? []), row.module]);
  }
  for (const [companyId, modules] of byCompany) byCompany.set(companyId, inCatalogueOrder(modules));
  return byCompany;
}

/**
 * Makes `modules` the company's active set: missing ones are activated (by `actorId`, at `now`),
 * the others removed. Modules already active keep their activation date. Run inside a transaction.
 */
export function setCompanyModules(db: Db, companyId: string, modules: readonly ModuleCode[], actorId: string, now: Date): void {
  const current = companyModules(db, companyId);
  for (const module of current) {
    if (!modules.includes(module)) run(db, "DELETE FROM company_modules WHERE company_id = ? AND module = ?", companyId, module);
  }
  for (const module of modules) {
    if (!current.includes(module)) {
      run(
        db,
        "INSERT INTO company_modules (company_id, module, activated_at, activated_by) VALUES (?,?,?,?)",
        companyId,
        module,
        iso(now),
        actorId,
      );
    }
  }
}
