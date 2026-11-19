// Builds a ready-to-serve instance: database, migrations, simulated connectors, demo seed, Hono app.
// Same start-up sequence as the v0.1.0 reference.
import type { Hono } from "hono";
import { type Db, migrate, openDatabase } from "./core/db.ts";
import { randomBytes } from "./core/random.ts";
import { type AppConfig, createApp } from "./http/app.ts";
import type { AppEnv } from "./http/context.ts";
import { createDemoConnectors as createConnectors } from "./modules/connectors/index.ts";
import { type DemoConnectorSet as Connectors } from "./modules/connectors/types.ts";
import { hasData, seedDemo } from "./seed/index.ts";

export interface InstanceOptions {
  /** SQLite file, ":memory:" by default. */
  dbPath?: string;
  /** Secret signing session cookies (generated when absent). */
  sessionSecret?: string;
  /** Secret of the simulated providers' notifications (generated when absent). */
  webhookSecret?: string;
  /** Optional access code gating the whole API ("" = none). */
  accessCode?: string;
  /** Clock. */
  now?: () => Date;
}

export interface Instance {
  app: Hono<AppEnv>;
  db: Db;
  config: AppConfig;
  connectors: Connectors;
}

export async function createInstance(options: InstanceOptions = {}): Promise<Instance> {
  // Generated secrets are drawn in this order (session, then webhook) before anything else.
  const sessionSecret = options.sessionSecret ?? randomBytes(32).toString("hex");
  const webhookSecret = options.webhookSecret ?? randomBytes(32).toString("hex");
  const config: AppConfig = {
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
  if (!hasData(db)) await seedDemo(db, connectors);
  const app = createApp(db, config, connectors, options.now ?? (() => new Date()));
  return { app, db, config, connectors };
}
