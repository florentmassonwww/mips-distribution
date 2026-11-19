// SQLite access (node:sqlite), nested transactions and migrations.
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Db = DatabaseSync;
export type Row = Record<string, any>;
type Params = SQLInputValue[];

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");

export function openDatabase(file: string): Db {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  return db;
}

/** All rows of a query. */
export function all<T = Row>(db: Db, sql: string, ...params: Params): T[] {
  return db.prepare(sql).all(...params) as T[];
}

/** First row of a query, or undefined. */
export function get<T = Row>(db: Db, sql: string, ...params: Params): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

/** Runs a statement and returns the number of changed rows. */
export function run(db: Db, sql: string, ...params: Params): number {
  return Number(db.prepare(sql).run(...params).changes);
}

const depth = new WeakMap<Db, number>();

/** Runs `fn` in a transaction; nested calls use savepoints. Rolls back on any thrown error. */
export function transaction<T>(db: Db, fn: () => T): T {
  const level = depth.get(db) ?? 0;
  const savepoint = `sp_${level}`;
  db.exec(level === 0 ? "BEGIN IMMEDIATE" : `SAVEPOINT ${savepoint}`);
  depth.set(db, level + 1);
  try {
    const result = fn();
    db.exec(level === 0 ? "COMMIT" : `RELEASE ${savepoint}`);
    return result;
  } catch (error) {
    db.exec(level === 0 ? "ROLLBACK" : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
    throw error;
  } finally {
    depth.set(db, level);
  }
}

/** Applies the SQL files of apps/api/migrations not yet recorded, in name order. Returns their names. */
export function migrate(db: Db): string[] {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = new Set(all<{ name: string }>(db, "SELECT name FROM schema_migrations").map((r) => r.name));
  const done: string[] = [];
  for (const name of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(name)) continue;
    transaction(db, () => {
      db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"));
      run(db, "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)", name, new Date().toISOString());
    });
    done.push(name);
  }
  return done;
}
