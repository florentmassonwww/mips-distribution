// Areas of the back office: the navigation of each role and the home page of each profile.
// Labels are translated once, when the module loads: changing the language reloads the page.
import { K } from "../legacy/i18n.js";

/** [path, label] of a navigation link. */
export type NavLink = readonly [path: string, label: string];
/** [group title, links] of a navigation group. */
export type NavGroup = readonly [title: string, links: readonly NavLink[]];

export const CENTRALE_NAV: NavGroup = [
  K("Centrale"),
  [
    ["/centrale", K("Tableau de bord")],
    ["/centrale/commandes", K("Commandes")],
    ["/centrale/tournees", K("Tournées")],
    ["/centrale/stocks", K("Stocks")],
    ["/centrale/incidents", K("Incidents")],
  ],
];

export const FINANCE_NAV: NavGroup = [
  K("Finance"),
  [
    ["/finance", K("Journal des transactions")],
    ["/finance/factures", K("Factures")],
    ["/finance/rapprochement", K("Rapprochement")],
    ["/finance/exceptions", K("Exceptions")],
    ["/finance/cloture", K("Clôture quotidienne")],
    ["/finance/erp", "ERP"],
  ],
];

export const ADMIN_NAV: NavGroup = [
  K("Administration"),
  [
    ["/admin/utilisateurs", K("Utilisateurs")],
    ["/admin/parametres", K("Paramètres")],
    ["/admin/audit", K("Journal d'audit")],
  ],
];

/** Navigation of a distribution company (and of the platform team), per role. */
export const DISTRIBUTION_NAV: Record<string, readonly NavGroup[]> = {
  dispatcher: [CENTRALE_NAV],
  // Finance follows operations read-only.
  finance: [
    [
      K("Suivi"),
      [
        ["/centrale", K("Tableau de bord")],
        ["/centrale/commandes", K("Commandes")],
        ["/centrale/tournees", K("Tournées")],
      ],
    ],
    FINANCE_NAV,
  ],
  company_admin: [CENTRALE_NAV, FINANCE_NAV, ADMIN_NAV],
  platform_admin: [
    [
      K("Plateforme"),
      [
        ["/plateforme", K("Entreprises")],
        ["/plateforme/audit", K("Journal d'audit")],
      ],
    ],
  ],
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
  K("Club"),
  [
    ["/club", K("Recouvrement")],
    ["/club/membres", K("Membres")],
    ["/club/cotisations", K("Cotisations")],
    ["/club/relances", K("Relances")],
    ["/club/barriere", K("Barrière")],
  ],
];

export const CLUB_ACCOUNTING_NAV: NavGroup = [
  K("Comptabilité"),
  [
    ["/club/encaissements", K("Encaissements")],
    ["/club/rapprochement", K("Rapprochement")],
    ["/club/exceptions", K("Exceptions")],
    ["/club/export", K("Export comptable")],
    ["/club/erp", K("Synchronisation comptable")],
  ],
];

/** Navigation of a sports club, per role (the reception desk has its own full-screen page). */
export const CLUB_NAV: Record<string, readonly NavGroup[]> = {
  dispatcher: [CLUB_NAV_GROUP],
  finance: [CLUB_NAV_GROUP, CLUB_ACCOUNTING_NAV],
  company_admin: [CLUB_NAV_GROUP, CLUB_ACCOUNTING_NAV, ADMIN_NAV],
};

/** Home of each role in a sports club. */
export const CLUB_HOME: Record<string, string> = {
  agent: "/club/accueil",
  dispatcher: "/club",
  finance: "/club",
  company_admin: "/club",
};

/** Home page of a profile; "/" when the role has none. */
export const homePathFor = (role: string, vertical?: string | null): string =>
  (vertical === "club" ? CLUB_HOME[role] : DISTRIBUTION_HOME[role]) ?? "/";

/** Navigation links whose highlight must not extend to their sub-pages (area dashboards). */
export const EXACT_MATCH_PATHS: readonly string[] = ["/centrale", "/finance", "/plateforme", "/club"];

/** Roles allowed in each back-office area. */
export const OPS_AREA_ROLES = ["company_admin", "dispatcher"];
export const BACK_OFFICE_ROLES = ["company_admin", "dispatcher", "finance"];
export const FINANCE_AREA_ROLES = ["company_admin", "finance"];
