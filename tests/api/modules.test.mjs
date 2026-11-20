// Module subscriptions: every module route is refused (403 module_not_enabled) to a company
// without the module; the platform activates and deactivates modules, audited, data kept.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { startServer } from "./lib/server.mjs";

/** Areas of the Distribution module (the same as the v0.1.0 `vertical` guards). */
const DISTRIBUTION_PATHS = [
  "/api/agent/*",
  "/api/centrale/*",
  "/api/payments",
  "/api/payments/*",
  "/api/chain/*",
  "/api/invoices/*",
  "/api/finance/journal",
  "/api/finance/invoices",
  "/api/finance/reconciliation",
  "/api/finance/statements",
  "/api/finance/statements/*",
  "/api/finance/close",
  "/api/finance/payments/*",
];
const isDistributionRoute = (path) =>
  DISTRIBUTION_PATHS.some((area) => (area.endsWith("/*") ? path.startsWith(area.slice(0, -1)) : path === area));
const isClubRoute = (path) => path.startsWith("/api/club/");

const NOT_ENABLED = {
  distribution: { error: { code: "module_not_enabled", message: "Le module Distribution n'est pas activé pour cette entreprise." } },
  club: { error: { code: "module_not_enabled", message: "Le module Club n'est pas activé pour cette entreprise." } },
};

/** Calls a registered route with placeholder parameters (the guards answer before any lookup). */
const callRoute = (client, { method, path }) =>
  client.request(method, path.replace(/:[a-zA-Z]+/g, "x"), method === "GET" ? undefined : {});

describe("module routes are refused without the module", () => {
  let server;
  before(async () => (server = await startServer()));
  after(() => server.close());

  test("every Distribution route answers 403 module_not_enabled to a company with the Club module only", async () => {
    const club = await server.as("u_cs_admin");
    const routes = server.routes().filter((route) => isDistributionRoute(route.path));
    assert.ok(routes.length >= 25, `distribution routes found: ${routes.length}`);
    for (const route of routes) {
      const res = await callRoute(club, route);
      assert.equal(res.status, 403, `${route.method} ${route.path}`);
      assert.deepEqual(res.data, NOT_ENABLED.distribution, `${route.method} ${route.path}`);
    }
  });

  test("every Club route answers 403 module_not_enabled to a company with the Distribution module only", async () => {
    // The company admin holds every club role, so only the module decides.
    const distribution = await server.as("u_bd_admin");
    const routes = server.routes().filter((route) => isClubRoute(route.path));
    assert.ok(routes.length >= 20, `club routes found: ${routes.length}`);
    for (const route of routes) {
      const res = await callRoute(distribution, route);
      assert.equal(res.status, 403, `${route.method} ${route.path}`);
      assert.deepEqual(res.data, NOT_ENABLED.club, `${route.method} ${route.path}`);
    }
  });

  test("every role of a company without the module is refused, whatever the role", async () => {
    for (const user of ["u_cs_secretariat", "u_cs_compta", "u_cs_accueil"]) {
      const client = await server.as(user);
      assert.deepEqual((await client.get("/api/centrale/dashboard")).data, NOT_ENABLED.distribution, user);
      assert.deepEqual((await client.get("/api/agent/routes")).data, NOT_ENABLED.distribution, user);
    }
    // Club routes check the role first, then the module (same order as v0.1.0): the gate events
    // are for the front desk (admin, secretariat, desk), so a finance user is refused by role.
    for (const user of ["u_bd_centrale", "u_bd_agent1"]) {
      assert.deepEqual((await (await server.as(user)).get("/api/club/gate/events")).data, NOT_ENABLED.club, user);
    }
    assert.equal((await (await server.as("u_bd_finance")).get("/api/club/gate/events")).data.error.code, "forbidden");
  });

  test("checks that do not depend on modules are unchanged: 401, 403 forbidden", async () => {
    const anonymous = server.anonymous();
    assert.equal((await anonymous.get("/api/centrale/dashboard")).status, 401);
    assert.equal((await anonymous.get("/api/club/dashboard")).status, 401);
    const platform = await server.as("u_platform");
    assert.deepEqual((await platform.get("/api/centrale/dashboard")).data.error.code, "forbidden");
    assert.deepEqual((await platform.get("/api/club/dashboard")).data.error.code, "forbidden");
    const agent = await server.as("u_bd_agent1");
    assert.deepEqual((await agent.get("/api/centrale/dashboard")).data.error.code, "forbidden");
  });

  test("the session and the demo users list the modules", async () => {
    const expected = { u_bd_admin: ["distribution"], u_go_admin: ["distribution"], u_cs_admin: ["club"], u_platform: [] };
    for (const [user, modules] of Object.entries(expected)) {
      const { data } = await (await server.as(user)).get("/api/session");
      assert.deepEqual(data.user.modules, modules, user);
      assert.equal(Object.hasOwn(data.user, "vertical"), false);
    }
    const byCompany = { co_bd: ["distribution"], co_go: ["distribution"], co_cs: ["club"] };
    const { data: users } = await server.anonymous().get("/api/demo/users");
    for (const user of users) {
      assert.deepEqual(user.company_modules, byCompany[user.company_id] ?? [], user.id);
      assert.equal(Object.hasOwn(user, "company_vertical"), false);
    }
  });
});

describe("platform: module subscriptions", () => {
  let server;
  let platform;
  before(async () => {
    server = await startServer();
    platform = await server.as("u_platform");
  });
  after(() => server.close());

  test("the company list shows each company's modules", async () => {
    const { data } = await platform.get("/api/platform/companies");
    assert.deepEqual(
      data.map((company) => [company.id, company.modules]),
      [
        ["co_bd", ["distribution"]],
        ["co_go", ["distribution"]],
        ["co_cs", ["club"]],
      ],
    );
    assert.equal(Object.hasOwn(data[0], "vertical"), false);
  });

  test("deactivating a module closes its routes and keeps its data; reactivating opens them again", async () => {
    const admin = await server.as("u_bd_admin");
    const ordersBefore = await admin.get("/api/centrale/orders");
    assert.equal(ordersBefore.status, 200);
    assert.ok(ordersBefore.data.length > 0);

    const off = await platform.put("/api/platform/companies/co_bd/modules", { modules: [] });
    assert.deepEqual(off.data, { ok: true, modules: [] });
    assert.deepEqual((await admin.get("/api/centrale/orders")).data, NOT_ENABLED.distribution);
    assert.deepEqual((await admin.get("/api/session")).data.user.modules, []);
    // Without any module, administration and audit stay open.
    assert.equal((await admin.get("/api/admin/users")).status, 200);
    assert.equal((await admin.get("/api/admin/audit")).status, 200);
    assert.deepEqual((await admin.get("/api/admin/settings")).data.subscription.modules, []);

    await platform.put("/api/platform/companies/co_bd/modules", { modules: ["distribution"] });
    const ordersAfter = await admin.get("/api/centrale/orders");
    assert.equal(ordersAfter.status, 200);
    assert.deepEqual(ordersAfter.data, ordersBefore.data);
  });

  test("a company can have both modules", async () => {
    const club = await server.as("u_cs_admin");
    const res = await platform.put("/api/platform/companies/co_cs/modules", { modules: ["club", "distribution"] });
    assert.deepEqual(res.data, { ok: true, modules: ["distribution", "club"] }, "returned in catalogue order");
    assert.deepEqual((await club.get("/api/session")).data.user.modules, ["distribution", "club"]);
    assert.equal((await club.get("/api/club/dashboard")).status, 200);
    assert.equal((await club.get("/api/centrale/dashboard")).status, 200);
    assert.equal((await club.get("/api/finance/journal")).status, 200);
    await platform.put("/api/platform/companies/co_cs/modules", { modules: ["club"] });
    assert.deepEqual((await club.get("/api/centrale/dashboard")).data, NOT_ENABLED.distribution);
    assert.equal((await club.get("/api/club/dashboard")).status, 200);
  });

  test("a new company gets its modules (default distribution); club settings are created with the club module", async () => {
    const both = await platform.post("/api/platform/companies", {
      name: "Multi Démo",
      slug: "multi-demo",
      adminName: "Admin Multi",
      adminEmail: "admin@multi.exemple.invalid",
      modules: ["club", "distribution"],
    });
    assert.equal(both.status, 200);
    const plain = await platform.post("/api/platform/companies", {
      name: "Simple Démo",
      slug: "simple-demo",
      adminName: "Admin Simple",
      adminEmail: "admin@simple.exemple.invalid",
    });
    const legacy = await platform.post("/api/platform/companies", {
      name: "Ancien Club Démo",
      slug: "ancien-club",
      adminName: "Admin Ancien",
      adminEmail: "admin@ancien.exemple.invalid",
      vertical: "club",
    });
    const { data: companies } = await platform.get("/api/platform/companies");
    const modulesOf = (id) => companies.find((company) => company.id === id).modules;
    assert.deepEqual(modulesOf(both.data.id), ["distribution", "club"]);
    assert.deepEqual(modulesOf(plain.data.id), ["distribution"]);
    assert.deepEqual(modulesOf(legacy.data.id), ["club"], "the v0.1.0 vertical field is still accepted");

    const { data: users } = await server.anonymous().get("/api/demo/users");
    const adminOf = (companyId) => users.find((user) => user.company_id === companyId).id;
    const multiAdmin = await server.as(adminOf(both.data.id));
    const { data: settings } = await multiAdmin.get("/api/admin/settings");
    assert.equal(settings.settings.club.refPrefix, "MULT");
    assert.deepEqual(settings.subscription.modules, ["distribution", "club"]);
    assert.equal((await multiAdmin.get("/api/club/dashboard")).status, 200);
    assert.equal((await multiAdmin.get("/api/centrale/dashboard")).status, 200);
  });

  test("module lists are validated; unknown companies are 404; only the platform may change them", async () => {
    for (const modules of [["inventaire"], ["club", "club"], "club", null]) {
      const res = await platform.put("/api/platform/companies/co_go/modules", { modules });
      assert.equal(res.status, 400, JSON.stringify(modules));
      assert.equal(res.data.error.code, "invalid_input");
    }
    const create = await platform.post("/api/platform/companies", {
      name: "Vide Démo",
      slug: "vide-demo",
      adminName: "Admin Vide",
      adminEmail: "admin@vide.exemple.invalid",
      modules: [],
    });
    assert.equal(create.status, 400, "a new company starts with at least one module");
    const unknown = await platform.put("/api/platform/companies/co_inconnue/modules", { modules: ["club"] });
    assert.equal(unknown.status, 404);
    const admin = await server.as("u_go_admin");
    assert.equal((await admin.put("/api/platform/companies/co_go/modules", { modules: ["club"] })).status, 403);
    assert.deepEqual((await platform.get("/api/platform/companies")).data.find((company) => company.id === "co_go").modules, ["distribution"]);
  });

  test("module changes are audited with before and after", async () => {
    await platform.put("/api/platform/companies/co_go/modules", { modules: ["distribution", "club"] });
    await platform.put("/api/platform/companies/co_go/modules", { modules: ["club"] });
    const { data: audit } = await platform.get("/api/platform/audit");
    const changes = audit.filter((row) => row.action === "company.modules_updated" && row.entity_id === "co_go");
    assert.deepEqual(
      changes.map((row) => row.details),
      [
        { before: ["distribution", "club"], after: ["club"] },
        { before: ["distribution"], after: ["distribution", "club"] },
      ],
    );
    assert.equal(changes[0].actor_role, "platform_admin");
    assert.equal(changes[0].company, "Grossiste Démo Océan");
    const companyAudit = await (await server.as("u_go_admin")).get("/api/admin/audit");
    assert.ok(companyAudit.data.some((row) => row.action === "company.modules_updated"), "the company sees it in its own audit log");
  });
});
