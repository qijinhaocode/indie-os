import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Support DATABASE_URL env var for Docker deployments.
// The directory must exist before starting (Dockerfile creates /app/data).
const dbUrl = process.env.DATABASE_URL ?? "./indie-os.db";

const sqlite = new Database(dbUrl);

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
