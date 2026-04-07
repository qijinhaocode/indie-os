import { db } from "@/db";
import { timeLogs, revenueEntries, projects } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const t = await getTranslations("reports");

  const allProjects = await db
    .select({ id: projects.id, name: projects.name, status: projects.status })
    .from(projects)
    .orderBy(projects.name);

  // Monthly time per project (last 12 months)
  const monthlyTime = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${timeLogs.date})`,
      projectId: timeLogs.projectId,
      minutes: sql<number>`sum(${timeLogs.minutes})`,
    })
    .from(timeLogs)
    .where(
      sql`${timeLogs.date} >= date('now', '-12 months')`
    )
    .groupBy(
      sql`strftime('%Y-%m', ${timeLogs.date})`,
      timeLogs.projectId
    )
    .orderBy(sql`strftime('%Y-%m', ${timeLogs.date})`);

  // Monthly revenue per project (last 12 months)
  const monthlyRevenue = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${revenueEntries.date})`,
      projectId: revenueEntries.projectId,
      amount: sql<number>`sum(${revenueEntries.amount})`,
      type: revenueEntries.type,
    })
    .from(revenueEntries)
    .where(
      sql`${revenueEntries.date} >= date('now', '-12 months')`
    )
    .groupBy(
      sql`strftime('%Y-%m', ${revenueEntries.date})`,
      revenueEntries.projectId,
      revenueEntries.type
    )
    .orderBy(sql`strftime('%Y-%m', ${revenueEntries.date})`);

  // Per-project totals (all time)
  const projectTotals = await db
    .select({
      projectId: timeLogs.projectId,
      totalMinutes: sql<number>`sum(${timeLogs.minutes})`,
    })
    .from(timeLogs)
    .groupBy(timeLogs.projectId);

  const projectRevenueTotals = await db
    .select({
      projectId: revenueEntries.projectId,
      totalRevenue: sql<number>`sum(${revenueEntries.amount})`,
    })
    .from(revenueEntries)
    .where(eq(revenueEntries.type, "mrr"))
    .groupBy(revenueEntries.projectId);

  // Weekly time breakdown (last 8 weeks)
  const weeklyTime = await db
    .select({
      week: sql<string>`strftime('%Y-W%W', ${timeLogs.date})`,
      projectId: timeLogs.projectId,
      minutes: sql<number>`sum(${timeLogs.minutes})`,
    })
    .from(timeLogs)
    .where(sql`${timeLogs.date} >= date('now', '-56 days')`)
    .groupBy(
      sql`strftime('%Y-W%W', ${timeLogs.date})`,
      timeLogs.projectId
    )
    .orderBy(sql`strftime('%Y-W%W', ${timeLogs.date})`);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>
      <ReportsClient
        projects={allProjects}
        monthlyTime={monthlyTime}
        monthlyRevenue={monthlyRevenue}
        weeklyTime={weeklyTime}
        projectTotals={projectTotals}
        projectRevenueTotals={projectRevenueTotals}
      />
    </div>
  );
}
