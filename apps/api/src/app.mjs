// Builds a ready-to-serve instance: database, migrations, simulated connectors, demo seed, Hono app.
// Same start-up sequence as the v0.1.0 reference.
import { openDatabase, migrate, createConnectors, seed, hasData, createApp } from "./legacy/index.mjs";
import { randomBytes } from "./core/random.ts";

/**
 * @param {object} [options]
 * @param {string} [options.dbPath] SQLite file, ":memory:" by default.
 * @param {string} [options.sessionSecret] Secret signing session cookies (generated when absent).
 * @param {string} [options.webhookSecret] Secret of the simulated providers' notifications (generated when absent).
 * @param {string} [options.accessCode] Optional access code gating the whole API ("" = none).
 * @param {() => Date} [options.now] Clock.
 */
export async function createInstance(options = {}) {
  const sessionSecret = options.sessionSecret ?? randomBytes(32).toString("hex");
  const webhookSecret = options.webhookSecret ?? randomBytes(32).toString("hex");
  const config = {
    demoMode: true,
    port: 0,
    dbPath: options.dbPath ?? ":memory:",
    sessionSecret,
    webhookSecret,
    webhookToleranceSeconds: 300,
    accessCode: options.accessCode ?? "",
  };
  const db = openDatabase(config.dbPath);
  migrate(db);
  const connectors = createConnectors(db, config.webhookSecret, config.webhookToleranceSeconds);
  if (!hasData(db)) await seed(db, connectors);
  const app = createApp(db, config, connectors, options.now ?? (() => new Date()));
  return { app, db, config, connectors };
}
