import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
export function openDb(
  path = process.env.DATABASE_PATH || "./data/bureausetu.sqlite",
) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  db.exec(
    readFileSync(
      new URL("./migrations/001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  db.prepare("INSERT OR IGNORE INTO schema_migrations VALUES(1,?)").run(
    new Date().toISOString(),
  );
  return db;
}
const depths = new WeakMap();
export function transaction(db, fn) {
  const depth = depths.get(db) || 0,
    savepoint = `nested_${depth}`;
  db.exec(depth ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
  depths.set(db, depth + 1);
  try {
    const result = fn();
    db.exec(depth ? `RELEASE SAVEPOINT ${savepoint}` : "COMMIT");
    return result;
  } catch (e) {
    if (depth) {
      db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      db.exec(`RELEASE SAVEPOINT ${savepoint}`);
    } else db.exec("ROLLBACK");
    throw e;
  } finally {
    depths.set(db, depth);
  }
}
