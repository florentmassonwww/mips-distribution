// Screens compared between the reference and the rebuilt interface: every route of the router.
// `as`: demo user signed in before opening the screen. `path`: hash route, or a function that finds
// an identifier through the API (signed in as `as`) and returns the route.

const api = (page, url) =>
  page.evaluate(async (u) => (await fetch(u, { credentials: "same-origin" })).json(), url);

export const SCREENS = [
  { name: "home", path: "/" },
  { name: "not-found", path: "/nexiste-pas" },

  { name: "terrain", as: "u_bd_agent1", path: "/terrain" },

  { name: "centrale", as: "u_bd_centrale", path: "/centrale" },
  { name: "centrale-commandes", as: "u_bd_centrale", path: "/centrale/commandes" },
  { name: "centrale-commande", as: "u_bd_centrale", path: async (p) => `/centrale/commandes/${(await api(p, "/api/centrale/orders"))[0].id}` },
  { name: "centrale-tournees", as: "u_bd_centrale", path: "/centrale/tournees" },
  { name: "centrale-tournee", as: "u_bd_centrale", path: async (p) => `/centrale/tournees/${(await api(p, "/api/centrale/routes"))[0].id}` },
  { name: "centrale-stocks", as: "u_bd_centrale", path: "/centrale/stocks" },
  { name: "centrale-incidents", as: "u_bd_centrale", path: "/centrale/incidents" },

  { name: "finance", as: "u_bd_finance", path: "/finance" },
  { name: "finance-factures", as: "u_bd_finance", path: "/finance/factures" },
  { name: "finance-chaine", as: "u_bd_finance", path: async (p) => `/finance/chaine/${(await api(p, "/api/centrale/orders"))[0].id}` },
  { name: "finance-rapprochement", as: "u_bd_finance", path: "/finance/rapprochement" },
  { name: "finance-exceptions", as: "u_bd_finance", path: "/finance/exceptions" },
  { name: "finance-cloture", as: "u_bd_finance", path: "/finance/cloture" },
  { name: "finance-erp", as: "u_bd_finance", path: "/finance/erp" },

  { name: "admin-utilisateurs", as: "u_bd_admin", path: "/admin/utilisateurs" },
  { name: "admin-parametres", as: "u_bd_admin", path: "/admin/parametres" },
  { name: "admin-audit", as: "u_bd_admin", path: "/admin/audit" },

  { name: "plateforme", as: "u_platform", path: "/plateforme" },
  { name: "plateforme-audit", as: "u_platform", path: "/plateforme/audit" },

  { name: "club-accueil", as: "u_cs_accueil", path: "/club/accueil" },
  { name: "club", as: "u_cs_admin", path: "/club" },
  { name: "club-membres", as: "u_cs_admin", path: "/club/membres" },
  { name: "club-membre", as: "u_cs_admin", path: async (p) => `/club/membres/${(await api(p, "/api/club/members")).find((m) => m.overdue_minor > 0).id}` },
  { name: "club-cotisations", as: "u_cs_admin", path: "/club/cotisations" },
  { name: "club-relances", as: "u_cs_admin", path: "/club/relances" },
  { name: "club-barriere", as: "u_cs_admin", path: "/club/barriere" },
  { name: "club-encaissements", as: "u_cs_admin", path: "/club/encaissements" },
  { name: "club-rapprochement", as: "u_cs_admin", path: "/club/rapprochement" },
  { name: "club-exceptions", as: "u_cs_admin", path: "/club/exceptions" },
  { name: "club-export", as: "u_cs_admin", path: "/club/export" },
  { name: "club-erp", as: "u_cs_admin", path: "/club/erp" },

  {
    // Public member page: the token comes from a reminder message (finance of the club).
    name: "membre-public",
    as: "u_cs_compta",
    path: async (p) => {
      const reminders = await api(p, "/api/club/reminders");
      const token = /membre\/([A-Za-z0-9_-]{16,})/.exec(reminders.map((r) => r.message).join(" "))[1];
      await p.evaluate(() => fetch("/api/logout", { method: "POST", headers: { "X-Requested-With": "mips-distribution" } }));
      return `/membre/${token}`;
    },
  },
  {
    // Public payment page: token of a seeded payment link, read from its API view (finance).
    name: "payer-public",
    as: "u_bd_finance",
    path: async (p) => {
      const journal = await api(p, "/api/finance/journal?method=link");
      const payment = await api(p, `/api/payments/${journal[0].id}`);
      const token = /payer\/([A-Za-z0-9_-]{16,})/.exec(JSON.stringify(payment))[1];
      await p.evaluate(() => fetch("/api/logout", { method: "POST", headers: { "X-Requested-With": "mips-distribution" } }));
      return `/payer/${token}`;
    },
  },
];
