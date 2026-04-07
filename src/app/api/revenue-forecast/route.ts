import { NextResponse } from "next/server";
import { db } from "@/db";
import { revenueEntries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface MonthlyPoint {
  month: string; // "YYYY-MM"
  mrr: number;
}

interface ForecastPoint {
  month: string;
  mrr: number;
  type: "actual" | "forecast" | "optimistic" | "pessimistic";
}

export async function GET() {
  // Aggregate MRR by month (last 12 months actual)
  const rows = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${revenueEntries.date})`,
      mrr: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)`,
    })
    .from(revenueEntries)
    .where(eq(revenueEntries.type, "mrr"))
    .groupBy(sql`strftime('%Y-%m', ${revenueEntries.date})`)
    .orderBy(sql`strftime('%Y-%m', ${revenueEntries.date})`);

  const actual: MonthlyPoint[] = rows.map((r) => ({ month: r.month, mrr: r.mrr }));

  if (actual.length < 2) {
    return NextResponse.json({ actual, forecast: [] });
  }

  // Compute month-over-month growth rates from last 6 months
  const window = actual.slice(-6);
  const growthRates: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const prev = window[i - 1].mrr;
    if (prev > 0) {
      growthRates.push((window[i].mrr - prev) / prev);
    }
  }

  const avgGrowth =
    growthRates.length > 0
      ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
      : 0;

  // Sort growth rates to get optimistic/pessimistic
  const sorted = [...growthRates].sort((a, b) => a - b);
  const pessimisticRate =
    sorted.length >= 3 ? sorted[Math.floor(sorted.length * 0.25)] : avgGrowth * 0.5;
  const optimisticRate =
    sorted.length >= 3 ? sorted[Math.floor(sorted.length * 0.75)] : avgGrowth * 1.5;

  const lastMrr = actual[actual.length - 1].mrr;
  const lastMonth = actual[actual.length - 1].month;

  const forecast: ForecastPoint[] = [];
  for (let i = 1; i <= 6; i++) {
    const [year, month] = lastMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    forecast.push({
      month: label,
      mrr: Math.max(0, lastMrr * Math.pow(1 + avgGrowth, i)),
      type: "forecast",
    });
  }

  const optimistic: ForecastPoint[] = [];
  const pessimistic: ForecastPoint[] = [];
  for (let i = 1; i <= 6; i++) {
    const [year, month] = lastMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    optimistic.push({
      month: label,
      mrr: Math.max(0, lastMrr * Math.pow(1 + optimisticRate, i)),
      type: "optimistic",
    });
    pessimistic.push({
      month: label,
      mrr: Math.max(0, lastMrr * Math.pow(1 + pessimisticRate, i)),
      type: "pessimistic",
    });
  }

  return NextResponse.json({
    actual,
    forecast,
    optimistic,
    pessimistic,
    avgGrowth,
    currentMrr: lastMrr,
    projectedMrr12m: lastMrr * Math.pow(1 + avgGrowth, 12),
  });
}
