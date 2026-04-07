import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { revenueEntries, timeLogs, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RevenueRow {
  date: string;
  amount: string;
  currency?: string;
  type?: string;
  source?: string;
  project?: string;
}

interface TimeRow {
  date: string;
  hours?: string;
  minutes?: string;
  project?: string;
  description?: string;
}

async function resolveProjectId(
  name: string,
  cache: Map<string, number>
): Promise<number | null> {
  if (cache.has(name)) return cache.get(name)!;
  const row = await db.query.projects.findFirst({
    where: (p, { like }) => like(p.name, name),
  });
  if (row) {
    cache.set(name, row.id);
    return row.id;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    type: "revenue" | "time";
    rows: RevenueRow[] | TimeRow[];
  };

  const cache = new Map<string, number>();
  let imported = 0;
  const errors: string[] = [];

  // Get all projects for fallback
  const allProjects = await db.select().from(projects);
  const defaultProjectId = allProjects[0]?.id ?? null;

  if (body.type === "revenue") {
    for (const raw of body.rows as RevenueRow[]) {
      const amount = parseFloat(raw.amount);
      if (isNaN(amount) || !raw.date) {
        errors.push(`Skipped: invalid row (${JSON.stringify(raw)})`);
        continue;
      }

      let projectId = defaultProjectId;
      if (raw.project) {
        const found = await resolveProjectId(raw.project, cache);
        if (found) projectId = found;
      }

      if (!projectId) {
        errors.push(`Skipped: no matching project for "${raw.project ?? ""}"`);
        continue;
      }

      try {
        await db.insert(revenueEntries).values({
          projectId,
          amount,
          currency: (raw.currency ?? "USD").toUpperCase(),
          type: (raw.type ?? "mrr") as "mrr" | "one_time" | "refund",
          source: raw.source ?? "csv-import",
          recordedAt: raw.date,
        });
        imported++;
      } catch (e) {
        errors.push(`Error inserting row: ${String(e)}`);
      }
    }
  } else if (body.type === "time") {
    for (const raw of body.rows as TimeRow[]) {
      if (!raw.date) {
        errors.push(`Skipped: missing date`);
        continue;
      }
      const hours = parseFloat(raw.hours ?? "0") || 0;
      const mins = parseFloat(raw.minutes ?? "0") || 0;
      const totalMinutes = Math.round(hours * 60 + mins);
      if (totalMinutes < 1) {
        errors.push(`Skipped: zero duration`);
        continue;
      }

      let projectId = defaultProjectId;
      if (raw.project) {
        const found = await resolveProjectId(raw.project, cache);
        if (found) projectId = found;
      }

      if (!projectId) {
        errors.push(`Skipped: no matching project for "${raw.project ?? ""}"`);
        continue;
      }

      try {
        await db.insert(timeLogs).values({
          projectId,
          minutes: totalMinutes,
          description: raw.description ?? null,
          loggedAt: raw.date,
        });
        imported++;
      } catch (e) {
        errors.push(`Error inserting row: ${String(e)}`);
      }
    }
  }

  return NextResponse.json({ imported, errors });
}
