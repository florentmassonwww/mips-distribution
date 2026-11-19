// Serves the API over HTTP (demo mode: every connector is simulated).
//
// Environment: PORT (default 8788), DB_PATH (default ":memory:"), SESSION_SECRET and
// WEBHOOK_SECRET (generated at start-up when unset; never logged), ACCESS_CODE (optional gate).
import { serve } from "@hono/node-server";
import { createInstance } from "./app.ts";

const env = process.env;
const port = Number(env.PORT || 8788);

const { app, db, config } = await createInstance({
  dbPath: env.DB_PATH || ":memory:",
  sessionSecret: env.SESSION_SECRET || undefined,
  webhookSecret: env.WEBHOOK_SECRET || undefined,
  accessCode: env.ACCESS_CODE || "",
});

const server = serve({ fetch: app.fetch, port }, (info) => {
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
