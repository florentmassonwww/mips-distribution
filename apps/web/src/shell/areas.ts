// Areas of the back office: the navigation of each role and the home page of each profile.
// What a user sees depends on their role and on the modules of their company: the areas of a
// module the company has not enabled are never linked.
// Labels are translated once, when the module loads: changing the language reloads the page.
import { translate } from "../i18n/translate.ts";
import { hasModule } from "../shared/modules.ts";

/** [path, label] of a navigation link. */
export type NavLink = readonly [path: string, label: string];
/** [group title, links] of a navigation group. */
export type NavGroup = readonly [title: string, links: readonly NavLink[]];

export const CENTRALE_NAV: NavGroup = [
  translate("Centrale"),
  [
    ["/centrale", translate("Tableau de bord")],
    ["/centrale/commandes", translate("Commandes")],
    ["/centrale/tournees", translate("Tournées")],
    ["/centrale/stocks", translate("Stocks")],
    ["/centrale/incidents", translate("Incidents")],
  ],
];

export const FINANCE_NAV: NavGroup = [
  translate("Finance"),
  [
    ["/finance", translate("Journal des transactions")],
    ["/finance/factures", translate("Factures")],
    ["/finance/rapprochement", translate("Rapprochement")],
    ["/finance/exceptions", translate("Exceptions")],
    ["/finance/cloture", translate("Clôture quotidienne")],
    ["/finance/erp", "ERP"],
  ],
];

export const ADMIN_NAV: NavGroup = [
  translate("Administration"),
  [
    ["/admin/utilisateurs", translate("Utilisateurs")],
    ["/admin/etablissements", translate("Établissements")],
    ["/admin/parametres", translate("Paramètres")],
    ["/admin/audit", translate("Journal d'audit")],
  ],
];

const PLATFORM_NAV: NavGroup = [
  translate("Plateforme"),
  [
    ["/plateforme", translate("Entreprises")],
    ["/plateforme/audit", translate("Journal d'audit")],
  ],
];

/** Navigation of the Distribution module, per role (administration excluded). */
export const DISTRIBUTION_NAV: Record<string, readonly NavGroup[]> = {
  dispatcher: [CENTRALE_NAV],
  // Finance follows operations read-only.
  finance: [
    [
      translate("Suivi"),
      [
        ["/centrale", translate("Tableau de bord")],
        ["/centrale/commandes", translate("Commandes")],
        ["/centrale/tournees", translate("Tournées")],
      ],
    ],
    FINANCE_NAV,
  ],
  company_admin: [CENTRALE_NAV, FINANCE_NAV],
};

/** Home of each role in a distribution company. */
export const DISTRIBUTION_HOME: Record<string, string> = {
  agent: "/terrain",
  dispatcher: "/centrale",
  finance: "/finance",
  company_admin: "/centrale",
  platform_admin: "/plateforme",
};

export const CLUB_NAV_GROUP: NavGroup = [
  translate("Club"),
  [
    ["/club", translate("Recouvrement")],
    ["/club/membres", translate("Membres")],
    ["/club/cotisations", translate("Cotisations")],
    ["/club/relances", translate("Relances")],
    ["/club/barriere", translate("Barrière")],
  ],
];

export const CLUB_ACCOUNTING_NAV: NavGroup = [
  translate("Comptabilité"),
  [
    ["/club/encaissements", translate("Encaissements")],
    ["/club/rapprochement", translate("Rapprochement")],
    ["/club/exceptions", translate("Exceptions")],
    ["/club/export", translate("Export comptable")],
    ["/club/erp", translate("Synchronisation comptable")],
  ],
];

/** Navigation of the Club module, per role (administration excluded; the reception desk has its own full-screen page). */
export const CLUB_NAV: Record<string, readonly NavGroup[]> = {
  dispatcher: [CLUB_NAV_GROUP],
  finance: [CLUB_NAV_GROUP, CLUB_ACCOUNTING_NAV],
  company_admin: [CLUB_NAV_GROUP, CLUB_ACCOUNTING_NAV],
};

/**
 * Navigation of a profile: the groups of each enabled module, in catalogue order, then the
 * administration for the company administrator (open whatever the modules).
 */
export function navigationFor(role: string, modules: readonly string[]): NavGroup[] {
  if (role === "platform_admin") return [PLATFORM_NAV];
  return [
    ...(hasModule(modules, "distribution") ? (DISTRIBUTION_NAV[role] ?? []) : []),
    ...(hasModule(modules, "club") ? (CLUB_NAV[role] ?? []) : []),
    ...(role === "company_admin" ? [ADMIN_NAV] : []),
  ];
}

/** Home of each role in a sports club. */
export const CLUB_HOME: Record<string, string> = {
  agent: "/club/accueil",
  dispatcher: "/club",
  finance: "/club",
  company_admin: "/club",
};

/** Home of the company administrator whose company has no module: administration stays open. */
const ADMIN_HOME = "/admin/utilisateurs";

/**
 * Home page of a profile: that of the first enabled module (catalogue order) that has one for the
 * role; the administration for a company administrator without module; "/" when there is none.
 */
export function homePathFor(role: string, modules: readonly string[] | null | undefined): string {
  if (role === "platform_admin") return DISTRIBUTION_HOME.platform_admin ?? "/";
  if (hasModule(modules, "distribution") && DISTRIBUTION_HOME[role]) return DISTRIBUTION_HOME[role];
  if (hasModule(modules, "club") && CLUB_HOME[role]) return CLUB_HOME[role];
  return role === "company_admin" ? ADMIN_HOME : "/";
}

/** Navigation links whose highlight must not extend to their sub-pages (area dashboards). */
export const EXACT_MATCH_PATHS: readonly string[] = ["/centrale", "/finance", "/plateforme", "/club"];

/** Roles allowed in each back-office area. */
export const OPS_AREA_ROLES = ["company_admin", "dispatcher"];
export const BACK_OFFICE_ROLES = ["company_admin", "dispatcher", "finance"];
export const FINANCE_AREA_ROLES = ["company_admin", "finance"];
