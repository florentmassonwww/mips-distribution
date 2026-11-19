// Session, authentication, CSRF, roles, company isolation, verticals and platform administration.
import { todaysRoute } from "./helpers.mjs";

const ROLE_PROBES = [
  ["GET", "/api/agent/routes"],
  ["GET", "/api/centrale/dashboard"],
  ["GET", "/api/centrale/stock"],
  ["GET", "/api/exceptions"],
  ["GET", "/api/exceptions?domain=finance"],
  ["GET", "/api/finance/journal"],
  ["GET", "/api/finance/close"],
  ["GET", "/api/admin/users"],
  ["GET", "/api/admin/settings"],
  ["GET", "/api/platform/companies"],
  ["GET", "/api/connectors"],
  ["GET", "/api/club/dashboard"],
];

export const platform = [
  {
    name: "session-anonymous",
    description: "Without a session: session endpoint, demo users, and a protected route refused with 401.",
    async run(api) {
      await api.get("/api/session");
      await api.get("/api/demo/users");
      await api.get("/api/centrale/dashboard", { label: "protected route without session" });
      await api.post("/api/demo/login", { userId: "u_nobody" }, { label: "login unknown user" });
      await api.get("/api/does-not-exist", { label: "unknown API route" });
    },
  },
  {
    name: "csrf-header-required",
    description: "A state-changing request without the X-Requested-With header is refused (403 csrf); webhooks are exempt.",
    async run(api) {
      await api.call("POST", "/api/demo/login", { userId: "u_bd_agent1" }, { csrf: false, label: "login without CSRF header" });
      await api.login("u_bd_agent1");
      await api.call("POST", "/api/agent/sync", { actions: [] }, { csrf: false, label: "sync without CSRF header" });
      await api.post("/api/agent/sync", { actions: [] }, { label: "sync with CSRF header" });
      await api.logout();
      await api.get("/api/session", { label: "session after logout" });
    },
  },
  {
    name: "roles-access-matrix",
    description: "Each role of each company hits the same set of endpoints: allowed, 403 forbidden or 403 wrong vertical.",
    async run(api) {
      for (const user of ["u_platform", "u_bd_admin", "u_bd_centrale", "u_bd_finance", "u_bd_agent1", "u_cs_admin", "u_cs_secretariat", "u_cs_compta", "u_cs_accueil"]) {
        await api.login(user);
        for (const [method, path] of ROLE_PROBES) await api.call(method, path, undefined, { label: `${user} ${path}`, record: false });
      }
    },
  },
  {
    name: "isolation-between-companies",
    description: "A user of Boissons Démo cannot read or change the routes, orders, payments or users of Grossiste Démo Océan (404).",
    async run(api) {
      await api.login("u_go_agent1");
      const goRoute = await todaysRoute(api, "other company's agent routes");
      await api.login("u_go_centrale");
      const orders = await api.get("/api/centrale/orders", { label: "other company's orders" });
      const goOrder = orders.data[0];
      api.must(goOrder, "the other company has an order");
      await api.login("u_go_admin");
      const users = await api.get("/api/admin/users", { label: "other company's users" });
      const goUser = users.data.find((u) => u.role === "agent");

      await api.login("u_bd_centrale");
      await api.get(`/api/centrale/routes/${goRoute.id}`, { label: "read other company's route" });
      await api.patch(`/api/centrale/routes/${goRoute.id}`, { name: "Intrusion" }, { label: "rename other company's route" });
      await api.post(`/api/centrale/routes/${goRoute.id}/load`, { extras: [] }, { label: "load other company's route" });
      await api.get(`/api/chain/${goOrder.id}`, { label: "read other company's order chain" });
      await api.post(`/api/centrale/orders/${goOrder.id}/status`, { status: "cancelled" }, { label: "cancel other company's order" });
      await api.login("u_bd_agent1");
      await api.post(`/api/agent/routes/${goRoute.id}/start`, {}, { label: "start other company's route" });
      await api.get(`/api/agent/routes/${goRoute.id}/bundle`, { label: "bundle of other company's route" });
      await api.login("u_bd_admin");
      await api.patch(`/api/admin/users/${goUser.id}`, { active: false }, { label: "deactivate other company's user" });
      await api.login("u_go_centrale");
      await api.get(`/api/centrale/routes/${goRoute.id}`, { label: "owner still reads its route unchanged" });
    },
  },
  {
    name: "verticals-separated",
    description: "A club user cannot use distribution endpoints and a distribution user cannot use club endpoints.",
    async run(api) {
      await api.login("u_cs_admin");
      await api.get("/api/centrale/dashboard", { label: "club admin on distribution dashboard" });
      await api.get("/api/finance/journal", { label: "club admin on distribution journal" });
      await api.get("/api/club/dashboard", { label: "club admin on club dashboard" });
      await api.login("u_bd_admin");
      await api.get("/api/club/dashboard", { label: "distribution admin on club dashboard" });
      await api.get("/api/club/members", { label: "distribution admin on club members" });
    },
  },
  {
    name: "platform-companies",
    description: "Platform admin lists, creates (distribution and club) and updates companies; duplicates are refused; audit records it.",
    async run(api) {
      await api.login("u_platform");
      await api.get("/api/platform/companies");
      await api.post("/api/platform/companies", { name: "Dépôt Démo Est", slug: "depot-demo-est", adminName: "Admin Démo Est", adminEmail: "admin@depot-est.exemple.invalid" }, { label: "create distribution company" });
      await api.post("/api/platform/companies", { name: "Tennis Club Démo", slug: "tennis-demo", adminName: "Admin Tennis Démo", adminEmail: "admin@tennis.exemple.invalid", vertical: "club" }, { label: "create club company" });
      await api.post("/api/platform/companies", { name: "Doublon", slug: "depot-demo-est", adminName: "Doublon Démo", adminEmail: "autre@exemple.invalid" }, { label: "duplicate slug refused" });
      await api.post("/api/platform/companies", { name: "Doublon 2", slug: "doublon-2", adminName: "Doublon Démo", adminEmail: "admin@depot-est.exemple.invalid" }, { label: "duplicate admin email refused" });
      await api.post("/api/platform/companies", { name: "X", slug: "BAD SLUG", adminName: "A", adminEmail: "pas-un-email" }, { label: "invalid input refused" });
      const list = await api.get("/api/platform/companies", { label: "companies after creation" });
      const created = list.data.find((c) => c.slug === "depot-demo-est");
      await api.patch(`/api/platform/companies/${created.id}`, { plan: "standard", subscriptionStatus: "actif", renewsAt: "2027-01-31" }, { label: "update plan and subscription" });
      await api.patch("/api/platform/companies/co_inconnue", { status: "suspended" }, { label: "unknown company" });
      await api.get("/api/platform/companies", { label: "companies after update" });
      await api.get("/api/platform/audit");
    },
  },
  {
    name: "platform-suspend-company",
    description: "A suspended company's users are refused (403 company_suspended) until it is reactivated.",
    async run(api) {
      await api.login("u_platform");
      await api.patch("/api/platform/companies/co_go", { status: "suspended" }, { label: "suspend Grossiste Démo Océan" });
      await api.login("u_go_centrale");
      await api.get("/api/centrale/dashboard", { label: "suspended company user refused" });
      await api.get("/api/session", { label: "session still readable" });
      await api.login("u_platform");
      await api.patch("/api/platform/companies/co_go", { status: "active" }, { label: "reactivate" });
      await api.login("u_go_centrale");
      await api.get("/api/centrale/dashboard", { label: "access restored", record: false });
    },
  },
  {
    name: "platform-connectors",
    description: "Connector catalogue (all simulated) as seen by the platform and a company admin.",
    async run(api) {
      await api.login("u_platform");
      await api.get("/api/connectors");
      await api.login("u_bd_finance");
      await api.get("/api/connectors", { label: "connectors seen by finance" });
    },
  },
  {
    name: "demo-reset",
    description: "Only the platform admin can reset the demo; after a reset the seeded data is back.",
    async run(api) {
      await api.login("u_bd_admin");
      await api.post("/api/demo/reset", {}, { label: "reset refused for company admin" });
      await api.post("/api/admin/users", { name: "Temporaire Démo", email: "temp@exemple.invalid", role: "agent" }, { label: "create a user before reset" });
      await api.login("u_platform");
      await api.post("/api/demo/reset", {}, { label: "reset by platform admin" });
      await api.login("u_bd_admin");
      await api.get("/api/admin/users", { label: "users after reset" });
    },
  },
];
