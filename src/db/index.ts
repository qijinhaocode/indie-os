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
  `CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    target_value REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'USD',
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    deadline TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS uptime_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    checked_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS kpi_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS kpi_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_id INTEGER NOT NULL REFERENCES kpi_metrics(id) ON DELETE CASCADE,
    value REAL NOT NULL,
    note TEXT,
    recorded_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🎯',
    occurred_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
];

for (const stmt of migrations) {
  try {
    sqlite.exec(stmt);
  } catch {
    // Column already exists — ignore
  }
}

export const db = drizzle(sqlite, { schema });
