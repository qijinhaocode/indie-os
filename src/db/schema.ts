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
  shareToken: text("share_token"),
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
  type: text("type", { enum: ["github", "vercel", "stripe", "http", "revenuecat", "lemonsqueezy", "paddle", "plausible"] }).notNull(),
  config: text("config").notNull().default("{}"),
  cachedData: text("cached_data"),
  lastSyncedAt: text("last_synced_at"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  type: text("type", {
    enum: ["mrr", "time_month", "time_total", "revenue_month"],
  }).notNull(),
  targetValue: real("target_value").notNull(),
  unit: text("unit").notNull().default("USD"),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  deadline: text("deadline"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const projectNotes = sqliteTable("project_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const kpiMetrics = sqliteTable("kpi_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull().default(""),
  description: text("description"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const kpiValues = sqliteTable("kpi_values", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricId: integer("metric_id")
    .notNull()
    .references(() => kpiMetrics.id, { onDelete: "cascade" }),
  value: real("value").notNull(),
  note: text("note"),
  recordedAt: text("recorded_at").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const milestones = sqliteTable("milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").default("🎯"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const uptimeHistory = sqliteTable("uptime_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  integrationId: integer("integration_id")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["up", "degraded", "down"] }).notNull(),
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  checkedAt: text("checked_at").notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Service = typeof services.$inferSelect;
export type RevenueEntry = typeof revenueEntries.$inferSelect;
export type TimeLog = typeof timeLogs.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type UptimeHistory = typeof uptimeHistory.$inferSelect;
export type ProjectNote = typeof projectNotes.$inferSelect;
export type KpiMetric = typeof kpiMetrics.$inferSelect;
export type KpiValue = typeof kpiValues.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
