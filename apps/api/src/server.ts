// Serves the API over HTTP (demo mode: every connector is simulated).
//
// Environment: PORT (default 8788), DB_PATH (default ":memory:"), SESSION_SECRET and
// WEBHOOK_SECRET (generated at start-up when unset; never logged), ACCESS_CODE (optional gate).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createInstance } from "./app.ts";

const env = process.env;
const port = Number(env.PORT || 8788);

const { app, db, config } = await createInstance({
  dbPath: env.DB_PATH || ":memory:",
  sessionSecret: env.SESSION_SECRET || undefined,
  webhookSecret: env.WEBHOOK_SECRET || undefined,
  accessCode: env.ACCESS_CODE || "",
});

// The built interface (apps/web/dist, `npm run build -w @mips/web`) is served on the same origin
// when present; /api/* always goes to the API.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "web", "dist");
const site = new Hono();
site.all("/api/*", (c) => app.fetch(c.req.raw));
if (fs.existsSync(path.join(webDist, "index.html"))) {
  const root = path.relative(process.cwd(), webDist) || ".";
  site.use("/*", serveStatic({ root }));
  site.get("*", serveStatic({ root, path: "index.html" }));
}

const server = serve({ fetch: site.fetch, port }, (info) => {
  console.log(
    `API MIPS (démo) sur http://localhost:${info.port} – base ${config.dbPath}` +
      (config.accessCode ? " – code d'accès requis" : ""),
  );
});

const shutdown = (): void => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
