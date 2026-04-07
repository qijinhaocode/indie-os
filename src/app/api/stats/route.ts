import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, revenueEntries, timeLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const allProjects = await db.select().from(projects);

    const activeProjects = allProjects.filter((p) => p.status === "active").length;
    const totalProjects = allProjects.length;

    const revenueResult = await db
      .select({ total: sql<number>`sum(${revenueEntries.amount})` })
      .from(revenueEntries)
      .where(eq(revenueEntries.type, "mrr"));
    const totalMRR = revenueResult[0]?.total ?? 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthlyTimeResult = await db
      .select({ total: sql<number>`sum(${timeLogs.minutes})` })
      .from(timeLogs)
      .where(sql`${timeLogs.loggedAt} >= ${startOfMonth}`);
    const monthlyMinutes = monthlyTimeResult[0]?.total ?? 0;

    return NextResponse.json({
      totalProjects,
      activeProjects,
      totalMRR,
      monthlyMinutes,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
