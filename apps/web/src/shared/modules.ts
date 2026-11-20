// Business modules a company subscribes to (GET /api/session `user.modules`, in catalogue order).
// The server refuses every route of a module the company has not enabled; the interface hides its
// areas and links so that the user never lands on a page full of refusals.
import { translate } from "../i18n/translate.ts";

/** Module catalogue, in display order (mirrors apps/api/src/core/modules.ts). */
export const MODULES = ["distribution", "club"] as const;
export type ModuleCode = (typeof MODULES)[number];

/** Name of each module, as shown in badges and on the platform screen. */
export const MODULE_LABEL: Record<ModuleCode, string> = {
  distribution: translate("Distribution"),
  club: translate("Club de sport"),
};

/** Refusal shown when the company has not enabled the module (same text as the server's). */
export const MODULE_NOT_ENABLED: Record<ModuleCode, string> = {
  distribution: translate("Le module Distribution n'est pas activé pour cette entreprise."),
  club: translate("Le module Club n'est pas activé pour cette entreprise."),
};

/** Known module codes of a list, in catalogue order. */
export const inCatalogueOrder = (modules: readonly string[] | null | undefined): ModuleCode[] =>
  MODULES.filter((module) => modules?.includes(module) ?? false);

export const hasModule = (modules: readonly string[] | null | undefined, module: ModuleCode): boolean =>
  modules?.includes(module) ?? false;

/**
 * True when the company runs the club module alone: the interface then speaks the club's language
 * (ClubOS brand, club role names), as v0.1.0 did for a club company.
 */
export const isClubOnly = (modules: readonly string[] | null | undefined): boolean =>
  hasModule(modules, "club") && !hasModule(modules, "distribution");
