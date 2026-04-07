import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["active", "paused", "archived", "idea"],
  })
    .notNull()
    .default("active"),
  repo: text("repo"),
  domain: text("domain"),
  techStack: text("tech_stack"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["frontend", "backend", "database", "cron", "third_party"],
  }).notNull(),
  url: text("url"),
  status: text("status", {
    enum: ["healthy", "degraded", "down", "unknown"],
  })
    .notNull()
    .default("unknown"),
  lastCheckedAt: text("last_checked_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const revenueEntries = sqliteTable("revenue_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  type: text("type", { enum: ["mrr", "one_time", "refund"] })
    .notNull()
    .default("mrr"),
  source: text("source"),
  recordedAt: text("recorded_at").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const timeLogs = sqliteTable("time_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  minutes: integer("minutes").notNull(),
  description: text("description"),
  loggedAt: text("logged_at").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const integrations = sqliteTable("integrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["github", "vercel", "stripe", "http"] }).notNull(),
  config: text("config").notNull().default("{}"),
  cachedData: text("cached_data"),
  lastSyncedAt: text("last_synced_at"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Service = typeof services.$inferSelect;
export type RevenueEntry = typeof revenueEntries.$inferSelect;
export type TimeLog = typeof timeLogs.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
