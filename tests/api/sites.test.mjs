// Sites of a company (stores, warehouses, depots): company admin only, validated, audited,
// isolated between companies.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { startServer } from "./lib/server.mjs";

describe("sites", () => {
  let server;
  let bd;
  let go;
  before(async () => {
    server = await startServer();
    bd = await server.as("u_bd_admin");
    go = await server.as("u_go_admin");
  });
  after(() => server.close());

  test("each demo distribution company has one depot; the club has none", async () => {
    const { data: sites } = await bd.get("/api/admin/sites");
    assert.equal(sites.length, 1);
    const [depot] = sites;
    assert.deepEqual(
      { ...depot, created_at: undefined },
      {
        id: "site_bd_dep-01",
        type: "depot",
        parent_site_id: null,
        code: "DEP-01",
        name: "Dépôt central (démo)",
        address: "",
        timezone: "Indian/Mauritius",
        status: "active",
        created_at: undefined,
      },
    );
    assert.deepEqual((await go.get("/api/admin/sites")).data.map((site) => site.code), ["DEP-01"]);
    assert.deepEqual((await (await server.as("u_cs_admin")).get("/api/admin/sites")).data, []);
  });

  test("only the company admin manages sites", async () => {
    for (const user of ["u_bd_centrale", "u_bd_finance", "u_bd_agent1", "u_platform"]) {
      const client = await server.as(user);
      assert.equal((await client.get("/api/admin/sites")).status, 403, user);
      assert.equal((await client.post("/api/admin/sites", { type: "store", code: "MAG-09", name: "Magasin" })).status, 403, user);
    }
    assert.equal((await server.anonymous().get("/api/admin/sites")).status, 401);
  });

  test("creation applies the defaults, stores the code upper case, and is audited", async () => {
    const res = await bd.post("/api/admin/sites", { type: "warehouse", code: "ent-nord", name: "Entrepôt Nord (démo)" });
    assert.equal(res.status, 200);
    assert.match(res.data.id, /^site_[0-9a-f]{20}$/);
    assert.deepEqual(
      { ...res.data, id: undefined, created_at: undefined },
      {
        id: undefined,
        type: "warehouse",
        parent_site_id: null,
        code: "ENT-NORD",
        name: "Entrepôt Nord (démo)",
        address: "",
        timezone: "Indian/Mauritius",
        status: "active",
        created_at: undefined,
      },
    );
    const { data: audit } = await bd.get("/api/admin/audit");
    const created = audit.find((row) => row.action === "site.created" && row.entity_id === res.data.id);
    assert.deepEqual(created.details, { code: "ENT-NORD", name: "Entrepôt Nord (démo)", type: "warehouse" });
    assert.equal(created.entity, "site");
  });

  test("invalid input is refused", async () => {
    const invalid = [
      { code: "MAG-01", name: "Magasin" },
      { type: "office", code: "MAG-01", name: "Magasin" },
      { type: "store", code: "MAG 01", name: "Magasin" },
      { type: "store", code: "", name: "Magasin" },
      { type: "store", code: "MAG-0123456789012345678", name: "Magasin" },
      { type: "store", code: "MAG-01", name: "M" },
      { type: "store", code: "MAG-01", name: "Magasin", timezone: "Mars/Olympus" },
      { type: "store", code: "MAG-01", name: "Magasin", status: "closed" },
    ];
    for (const body of invalid) {
      const res = await bd.post("/api/admin/sites", body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.data.error.code, "invalid_input");
    }
  });

  test("a code is unique within a company, not across companies", async () => {
    const taken = await bd.post("/api/admin/sites", { type: "store", code: "dep-01", name: "Doublon" });
    assert.equal(taken.status, 409);
    assert.deepEqual(taken.data.error.code, "site_code_taken");
    const other = await go.post("/api/admin/sites", { type: "store", code: "ENT-NORD", name: "Magasin Océan (démo)" });
    assert.equal(other.status, 200, "another company may use the same code");
    const store = await bd.post("/api/admin/sites", { type: "store", code: "MAG-01", name: "Magasin (démo)" });
    const renamed = await bd.patch(`/api/admin/sites/${store.data.id}`, { code: "DEP-01" });
    assert.equal(renamed.status, 409);
    assert.equal((await bd.patch(`/api/admin/sites/${store.data.id}`, { code: "MAG-01" })).status, 200, "keeping its own code is fine");
  });

  test("the parent must be a site of the same company, and not the site or one of its descendants", async () => {
    const goSite = (await go.get("/api/admin/sites")).data[0];
    const refused = await bd.post("/api/admin/sites", { type: "store", code: "MAG-02", name: "Magasin 2", parentSiteId: goSite.id });
    assert.equal(refused.status, 400);
    assert.equal(refused.data.error.code, "invalid_parent");
    assert.equal((await bd.post("/api/admin/sites", { type: "store", code: "MAG-02", name: "Magasin 2", parentSiteId: "site_inconnu" })).status, 400);

    const store = await bd.post("/api/admin/sites", { type: "store", code: "MAG-02", name: "Magasin 2", parentSiteId: "site_bd_dep-01" });
    assert.equal(store.status, 200);
    assert.equal(store.data.parent_site_id, "site_bd_dep-01");
    const self = await bd.patch(`/api/admin/sites/${store.data.id}`, { parentSiteId: store.data.id });
    assert.equal(self.data.error.code, "invalid_parent");
    const cycle = await bd.patch("/api/admin/sites/site_bd_dep-01", { parentSiteId: store.data.id });
    assert.equal(cycle.status, 400, "the depot cannot depend on its own child");
    const detached = await bd.patch(`/api/admin/sites/${store.data.id}`, { parentSiteId: null });
    assert.equal(detached.data.parent_site_id, null);
  });

  test("an update changes only the given fields and is audited", async () => {
    const store = await bd.post("/api/admin/sites", { type: "store", code: "MAG-03", name: "Magasin 3", address: "Port-Louis" });
    const res = await bd.patch(`/api/admin/sites/${store.data.id}`, { name: "Magasin Port-Louis (démo)", status: "inactive", timezone: "Europe/Paris" });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { ...store.data, name: "Magasin Port-Louis (démo)", status: "inactive", timezone: "Europe/Paris" });
    const { data: audit } = await bd.get("/api/admin/audit");
    const updated = audit.find((row) => row.action === "site.updated" && row.entity_id === store.data.id);
    assert.deepEqual(updated.details, { code: "MAG-03", name: "Magasin Port-Louis (démo)", status: "inactive", timezone: "Europe/Paris" });
    assert.equal((await bd.patch(`/api/admin/sites/${store.data.id}`, { type: "office" })).status, 400);
  });

  test("companies are isolated: another company's sites are invisible and 404", async () => {
    const goSites = (await go.get("/api/admin/sites")).data;
    const bdSites = (await bd.get("/api/admin/sites")).data;
    assert.ok(bdSites.every((site) => !goSites.some((other) => other.id === site.id)));
    const res = await bd.patch(`/api/admin/sites/${goSites[0].id}`, { name: "Piratage" });
    assert.equal(res.status, 404);
    assert.equal(res.data.error.code, "not_found");
    assert.equal((await go.get("/api/admin/sites")).data[0].name, goSites[0].name);
    assert.equal((await bd.patch("/api/admin/sites/site_inconnu", { name: "Inconnu" })).status, 404);
  });
});
