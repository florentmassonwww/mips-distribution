// Browser checks of step 2 (modules, sites, fees to be agreed) on the built interface.
//   node --no-warnings tests/e2e/check.mjs           (requires npm run build -w @mips/web)
// Serves apps/api in this process on a free port with fresh demo data for each viewport and
// language (1366 and 390 px, EN and FR), then checks through Chromium:
//  (a) a club user sees no Distribution area or link, and #/centrale shows the refusal, not data;
//  (b) a distribution user sees no Club area or link;
//  (c) the platform removes the Distribution module from Grossiste Démo Océan: its dispatcher then
//      has no Distribution area; adding it back restores it;
//  (d) the company admin creates a site, edits it, and sees the duplicate-code error;
//  (e) the settings show the fees "to be agreed" by default;
//  (f) no horizontal overflow and no console error on these screens.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const webDist = path.join(root, "apps", "web", "dist");
if (!fs.existsSync(path.join(webDist, "index.html"))) throw new Error("build the interface first: npm run build -w @mips/web");

const { createInstance } = await import(pathToFileURL(path.join(root, "apps/api/src/app.ts")).href);
const { serve } = await import("@hono/node-server");
const { serveStatic } = await import("@hono/node-server/serve-static");
const { Hono } = await import("hono");

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
];
const LANGS = ["en", "fr"];

/** Texts of each language, as the interface shows them. */
const T = {
  en: {
    noDistribution: "The Distribution module is not enabled for this company.",
    noClub: "The Club module is not enabled for this company.",
    resume: "Resume my area",
    sites: "Sites",
    toBeAgreed: "to be agreed",
    codeTaken: "This site code is already in use.",
    created: "Site created.",
    updated: "Site updated.",
    noModule: "no module",
    removeModule: "Remove the module",
    keptData: "data is kept",
    sportsClub: "Sports club",
  },
  fr: {
    noDistribution: "Le module Distribution n'est pas activé pour cette entreprise.",
    noClub: "Le module Club n'est pas activé pour cette entreprise.",
    resume: "Reprendre mon espace",
    sites: "Établissements",
    toBeAgreed: "à convenir",
    codeTaken: "Ce code d'établissement est déjà utilisé.",
    created: "Établissement créé.",
    updated: "Établissement modifié.",
    noModule: "aucun module",
    removeModule: "Retirer le module",
    keptData: "données du module sont conservées",
    sportsClub: "Club de sport",
  },
};

/** Fresh API and interface on a free port. */
async function startServer() {
  const instance = await createInstance();
  const site = new Hono();
  site.all("/api/*", (c) => instance.app.fetch(c.req.raw));
  site.use("/*", serveStatic({ root: path.relative(process.cwd(), webDist) || "." }));
  const server = await new Promise((resolve) => {
    const s = serve({ fetch: site.fetch, port: 0 }, () => resolve(s));
  });
  return { url: `http://localhost:${server.address().port}/`, close: () => new Promise((resolve) => server.close(resolve)) };
}

const browser = await chromium.launch();
let checks = 0;
const failures = [];

async function run(viewport, lang) {
  const t = T[lang];
  const server = await startServer();
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  context.setDefaultTimeout(10000);
  await context.addInitScript((l) => localStorage.setItem("md_lang", l), lang);
  const page = await context.newPage();
  const label = `${lang}.${viewport.width}`;
  /** Console errors; `allowed` lists the expected failed requests of the current step. */
  const errors = [];
  let allowed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !allowed.some((pattern) => pattern.test(message.text()))) errors.push(message.text());
  });

  const check = async (name, body) => {
    checks++;
    try {
      await body();
      console.log(`ok   ${label} ${name}`);
    } catch (error) {
      failures.push(`${label} ${name}: ${error.message.split("\n")[0]}`);
      console.log(`FAIL ${label} ${name}: ${error.message.split("\n")[0]}`);
    }
  };

  /** Waits until the page shows no loading placeholder. */
  const settle = async () => {
    await page.waitForFunction(() => document.querySelector("#root")?.children.length > 0);
    await page.waitForFunction(() => !/Chargement…|Loading…/.test(document.body.innerText));
  };
  /** Opens a hash route as a user would (session already loaded). */
  const open = async (hash) => {
    await page.evaluate((h) => {
      location.hash = h;
    }, hash);
    await page.waitForFunction((h) => location.hash === `#${h}`, hash);
    await settle();
  };
  /** Signs in as a demo user, then reloads on the home page. */
  const signIn = async (userId) => {
    const status = await page.evaluate(async (id) => {
      const response = await fetch("/api/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "mips-distribution" },
        body: JSON.stringify({ userId: id }),
      });
      return response.status;
    }, userId);
    assert.equal(status, 200, `login ${userId}`);
    // Same document: a hash change alone would not reload the session.
    await page.goto(`${server.url}#/`);
    await page.reload();
    await settle();
    await page.locator(".notice", { hasText: lang === "en" ? "Signed in" : "Connecté" }).first().waitFor();
  };
  /** Requirement (f) on the screen shown. */
  const assertClean = async (screen) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${screen}: horizontal overflow of ${overflow}px`);
    assert.deepEqual(errors.splice(0), [], `${screen}: console errors`);
  };
  const navHrefs = () => page.$$eval("nav a", (links) => links.map((link) => link.getAttribute("href")));
  const toast = (text) => page.locator(".toast", { hasText: text }).first().waitFor();

  await page.goto(server.url);
  await settle();

  await check("(a) club user: no Distribution area, refusal on #/centrale", async () => {
    await signIn("u_cs_admin");
    const resume = page.locator(".notice a", { hasText: t.resume });
    assert.equal(await resume.getAttribute("href"), "#/club");
    const card = page.locator("section.card", { hasText: "Club Sportif" }).first();
    assert.deepEqual(await card.locator("header .badge.info").allInnerTexts(), [t.sportsClub]);
    await assertClean("home");
    await open("/club");
    const hrefs = await navHrefs();
    assert.ok(hrefs.includes("#/club"), "club link shown");
    assert.ok(hrefs.includes("#/admin/etablissements"), "sites link shown");
    assert.ok(!hrefs.some((href) => /^#\/(centrale|finance|terrain)/.test(href)), `distribution links: ${hrefs.join(" ")}`);
    await assertClean("club");
    await open("/centrale");
    await page.locator(".notice.err[role=alert]", { hasText: t.noDistribution }).waitFor();
    assert.equal(await page.locator("table, .shell, .tile").count(), 0, "no data shown");
    await assertClean("centrale refused");
    await open("/terrain");
    await page.locator(".notice.err[role=alert]").waitFor();
    assert.equal(await page.locator("table, .shell").count(), 0, "no field data shown");
  });

  await check("(b) distribution user: no Club area", async () => {
    await signIn("u_bd_centrale");
    assert.equal(await page.locator(".notice a", { hasText: t.resume }).getAttribute("href"), "#/centrale");
    await open("/centrale");
    const hrefs = await navHrefs();
    assert.ok(hrefs.includes("#/centrale"), "centrale link shown");
    assert.ok(!hrefs.some((href) => href.startsWith("#/club")), `club links: ${hrefs.join(" ")}`);
    await assertClean("centrale");
    await open("/club");
    await page.locator(".notice.err[role=alert]", { hasText: t.noClub }).waitFor();
    assert.equal(await page.locator("table, .shell").count(), 0, "no club data shown");
    await assertClean("club refused");
  });

  /** As the platform user, sets the Distribution module of Grossiste Démo Océan on or off through the dialog. */
  const setOceanDistribution = async (on) => {
    await signIn("u_platform");
    await open("/plateforme");
    const row = page.locator("tr", { hasText: "Grossiste Démo Océan" });
    await row.getByRole("button", { name: /Modules/ }).click();
    const dialog = page.getByRole("dialog");
    const checkbox = dialog.getByRole("checkbox", { name: "Distribution" });
    await checkbox.waitFor();
    assert.equal(await checkbox.isChecked(), !on, "current state of the module");
    // Keyboard: the first checkbox has the focus; Space toggles it.
    assert.ok(await checkbox.evaluate((element) => element === document.activeElement), "focus in the dialog");
    await page.keyboard.press("Space");
    await dialog.locator("button[type=submit]").click();
    if (!on) {
      const confirm = page.getByRole("dialog").filter({ hasText: t.keptData });
      await confirm.waitFor();
      await confirm.getByRole("button", { name: t.removeModule }).click();
    }
    await page.locator(".toast.ok").first().waitFor();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    const text = await row.innerText();
    assert.ok(on ? text.includes("Distribution") : text.includes(t.noModule), `row after the change: ${text}`);
    await assertClean("platform");
  };

  await check("(c) platform removes Distribution: dispatcher loses the area, then gets it back", async () => {
    await setOceanDistribution(false);
    await signIn("u_go_centrale");
    assert.equal(await page.locator(".notice a", { hasText: t.resume }).count(), 0, "no resume link");
    const card = page.locator("section.card", { hasText: "Grossiste Démo Océan" }).first();
    assert.equal(await card.locator("header .badge.info").count(), 0, "no module badge");
    await assertClean("home without module");
    await open("/centrale");
    await page.locator(".notice.err[role=alert]", { hasText: t.noDistribution }).waitFor();
    assert.equal(await page.locator("nav a, table").count(), 0, "no navigation, no data");
    await assertClean("centrale refused");
    await setOceanDistribution(true);
    await signIn("u_go_centrale");
    assert.equal(await page.locator(".notice a", { hasText: t.resume }).getAttribute("href"), "#/centrale");
    await open("/centrale");
    assert.ok((await navHrefs()).includes("#/centrale"), "centrale link back");
    await page.locator(".tile").first().waitFor();
    await assertClean("centrale restored");
  });

  await check("(d) company admin creates and edits a site, sees the duplicate-code error", async () => {
    await signIn("u_bd_admin");
    await open("/admin/etablissements");
    assert.ok((await navHrefs()).includes("#/admin/etablissements"), "sites link in the admin navigation");
    await page.locator("nav a.active", { hasText: t.sites }).waitFor();
    await page.locator("td", { hasText: "DEP-01" }).waitFor();
    const form = page.locator("#site-form");
    const fill = async (code, name) => {
      await form.locator("select").first().selectOption("warehouse");
      await form.locator("#site-code").fill(code);
      await form.locator("input[type=text]").nth(1).fill(name);
    };
    await fill("ent-02", "Entrepôt nord");
    await form.locator("select").nth(1).selectOption({ label: "DEP-01 · Dépôt central (démo)" });
    await form.locator("button[type=submit]").click();
    await toast(t.created);
    const row = page.locator("tr", { hasText: "ENT-02" });
    await row.waitFor();
    assert.ok((await row.innerText()).includes("Dépôt central (démo)"), "parent shown");
    await row.getByRole("button", { name: /Entrepôt nord/ }).first().click();
    assert.equal(await form.locator("#site-code").inputValue(), "ENT-02");
    await form.locator("input[type=text]").nth(1).fill("Entrepôt nord (modifié)");
    await form.locator("button[type=submit]").click();
    await toast(t.updated);
    await page.locator("td", { hasText: "Entrepôt nord (modifié)" }).waitFor();
    await assertClean("sites");
    allowed = [/409/];
    await fill("ENT-02", "Doublon");
    await form.locator("button[type=submit]").click();
    await form.locator(".notice.err[role=alert]", { hasText: t.codeTaken }).waitFor();
    await page.locator(".toast.err", { hasText: t.codeTaken }).waitFor();
    allowed = [];
    assert.equal(await page.locator("td", { hasText: "Doublon" }).count(), 0, "duplicate not listed");
    await assertClean("sites duplicate");
  });

  await check("(e) settings: fees to be agreed by default", async () => {
    await signIn("u_bd_admin");
    await open("/admin/parametres");
    const feeInputs = page.locator("input[type=number][max='1000']");
    const count = await feeInputs.count();
    assert.ok(count >= 4, `fee inputs: ${count}`);
    for (let i = 0; i < count; i++) assert.equal(await feeInputs.nth(i).inputValue(), "", "fee left empty");
    const shown = await page.locator("td span.small.muted", { hasText: t.toBeAgreed }).count();
    assert.equal(shown, count, "every method reads to be agreed");
    assert.equal(await page.locator("td", { hasText: /\d+\.\d\d %/ }).count(), 0, "no percentage invented");
    assert.ok((await page.locator(".card", { hasText: "Distribution" }).first().innerText()).length > 0);
    await assertClean("settings");
  });

  await context.close();
  await server.close();
}

try {
  for (const viewport of VIEWPORTS) for (const lang of LANGS) await run(viewport, lang);
} finally {
  await browser.close();
}
console.log(`${checks - failures.length}/${checks} checks passed${failures.length ? `, ${failures.length} failed:\n  ${failures.join("\n  ")}` : "."}`);
process.exitCode = failures.length ? 1 : 0;
