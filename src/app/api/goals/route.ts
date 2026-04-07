import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, revenueEntries, timeLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

async function computeCurrentValue(
  type: string,
  projectId: number | null | undefined
): Promise<number> {
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  if (type === "mrr") {
    const q = db
      .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
      .from(revenueEntries)
      .where(eq(revenueEntries.type, "mrr"));
    if (projectId) {
      const res = await db
        .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
        .from(revenueEntries)
        .where(
          sql`${revenueEntries.type} = 'mrr' AND ${revenueEntries.projectId} = ${projectId}`
        );
      return res[0]?.total ?? 0;
    }
    const res = await q;
    return res[0]?.total ?? 0;
  }

  if (type === "revenue_month") {
    if (projectId) {
      const res = await db
        .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
        .from(revenueEntries)
        .where(
          sql`${revenueEntries.projectId} = ${projectId} AND ${revenueEntries.recordedAt} >= ${startOfMonth}`
        );
      return res[0]?.total ?? 0;
    }
    const res = await db
      .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
      .from(revenueEntries)
      .where(sql`${revenueEntries.recordedAt} >= ${startOfMonth}`);
    return res[0]?.total ?? 0;
  }

  if (type === "time_month") {
    if (projectId) {
      const res = await db
        .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
        .from(timeLogs)
        .where(
          sql`${timeLogs.projectId} = ${projectId} AND ${timeLogs.loggedAt} >= ${startOfMonth}`
        );
      return (res[0]?.total ?? 0) / 60;
    }
    const res = await db
      .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
      .from(timeLogs)
      .where(sql`${timeLogs.loggedAt} >= ${startOfMonth}`);
    return (res[0]?.total ?? 0) / 60;
  }

  if (type === "time_total") {
    if (projectId) {
      const res = await db
        .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
        .from(timeLogs)
        .where(eq(timeLogs.projectId, projectId));
      return (res[0]?.total ?? 0) / 60;
    }
    const res = await db
      .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
      .from(timeLogs);
    return (res[0]?.total ?? 0) / 60;
  }

  return 0;
}

export async function GET() {
  const allGoals = await db.select().from(goals).orderBy(goals.createdAt);

  const withProgress = await Promise.all(
    allGoals.map(async (g) => {
      const current = await computeCurrentValue(g.type, g.projectId);
      const pct = g.targetValue > 0 ? Math.min(100, Math.round((current / g.targetValue) * 100)) : 0;
      return { ...g, currentValue: current, pct };
    })
  );

  return NextResponse.json(withProgress);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    title: string;
    type: string;
    targetValue: number;
    unit?: string;
    projectId?: number | null;
    deadline?: string | null;
  };

  const inserted = await db
    .insert(goals)
    .values({
      title: body.title,
      type: body.type as "mrr" | "time_month" | "time_total" | "revenue_month",
      targetValue: body.targetValue,
      unit: body.unit ?? "USD",
      projectId: body.projectId ?? null,
      deadline: body.deadline ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
