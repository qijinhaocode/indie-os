import { db } from "@/db";
import { goals, projects, revenueEntries, timeLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { GoalsClient } from "./goals-client";

async function computeCurrentValue(
  type: string,
  projectId: number | null | undefined
): Promise<number> {
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  if (type === "mrr") {
    if (projectId) {
      const res = await db
        .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
        .from(revenueEntries)
        .where(sql`${revenueEntries.type} = 'mrr' AND ${revenueEntries.projectId} = ${projectId}`);
      return res[0]?.total ?? 0;
    }
    const res = await db
      .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
      .from(revenueEntries)
      .where(eq(revenueEntries.type, "mrr"));
    return res[0]?.total ?? 0;
  }

  if (type === "revenue_month") {
    const where = projectId
      ? sql`${revenueEntries.projectId} = ${projectId} AND ${revenueEntries.recordedAt} >= ${startOfMonth}`
      : sql`${revenueEntries.recordedAt} >= ${startOfMonth}`;
    const res = await db
      .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
      .from(revenueEntries)
      .where(where);
    return res[0]?.total ?? 0;
  }

  if (type === "time_month") {
    const where = projectId
      ? sql`${timeLogs.projectId} = ${projectId} AND ${timeLogs.loggedAt} >= ${startOfMonth}`
      : sql`${timeLogs.loggedAt} >= ${startOfMonth}`;
    const res = await db
      .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
      .from(timeLogs)
      .where(where);
    return (res[0]?.total ?? 0) / 60;
  }

  if (type === "time_total") {
    const q = projectId
      ? db.select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` }).from(timeLogs).where(eq(timeLogs.projectId, projectId))
      : db.select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` }).from(timeLogs);
    const res = await q;
    return (res[0]?.total ?? 0) / 60;
  }

  return 0;
}

export default async function GoalsPage() {
  const t = await getTranslations("goals");
  const allProjects = await db.select().from(projects).orderBy(projects.name);
  const allGoals = await db.select().from(goals).orderBy(goals.createdAt);

  const goalsWithProgress = await Promise.all(
    allGoals.map(async (g) => {
      const current = await computeCurrentValue(g.type, g.projectId);
      const pct = g.targetValue > 0 ? Math.min(100, Math.round((current / g.targetValue) * 100)) : 0;
      const projectName = g.projectId
        ? allProjects.find((p) => p.id === g.projectId)?.name ?? null
        : null;
      return { ...g, currentValue: current, pct, projectName };
    })
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>
      <GoalsClient
        goals={goalsWithProgress}
        projects={allProjects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
