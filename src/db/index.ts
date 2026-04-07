import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("./indie-os.db");

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Incremental migrations — safe to re-run on every startup
const migrations = [
  "ALTER TABLE projects ADD COLUMN share_token TEXT",
];

for (const stmt of migrations) {
  try {
    sqlite.exec(stmt);
  } catch {
    // Column already exists — ignore
  }
}

export const db = drizzle(sqlite, { schema });
