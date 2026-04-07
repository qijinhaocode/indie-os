import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, revenueEntries, timeLogs, integrations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"`
            : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") ?? "all";
  const format = searchParams.get("format") ?? "json";

  try {
    if (type === "revenue") {
      const entries = await db
        .select({
          id: revenueEntries.id,
          project: projects.name,
          amount: revenueEntries.amount,
          currency: revenueEntries.currency,
          type: revenueEntries.type,
          source: revenueEntries.source,
          recordedAt: revenueEntries.recordedAt,
          createdAt: revenueEntries.createdAt,
        })
        .from(revenueEntries)
        .leftJoin(projects, eq(revenueEntries.projectId, projects.id))
        .orderBy(desc(revenueEntries.recordedAt));

      if (format === "csv") {
        return new NextResponse(toCSV(entries as Record<string, unknown>[]), {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="revenue-${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      }
      return NextResponse.json(entries);
    }

    if (type === "time") {
      const logs = await db
        .select({
          id: timeLogs.id,
          project: projects.name,
          minutes: timeLogs.minutes,
          description: timeLogs.description,
          loggedAt: timeLogs.loggedAt,
          createdAt: timeLogs.createdAt,
        })
        .from(timeLogs)
        .leftJoin(projects, eq(timeLogs.projectId, projects.id))
        .orderBy(desc(timeLogs.loggedAt));

      if (format === "csv") {
        return new NextResponse(toCSV(logs as Record<string, unknown>[]), {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="time-logs-${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      }
      return NextResponse.json(logs);
    }

    // Full backup: JSON only
    const [allProjects, allRevenue, allTime, allIntegrations] = await Promise.all([
      db.select().from(projects).orderBy(desc(projects.createdAt)),
      db.select().from(revenueEntries).orderBy(desc(revenueEntries.recordedAt)),
      db.select().from(timeLogs).orderBy(desc(timeLogs.loggedAt)),
      db.select({ id: integrations.id, projectId: integrations.projectId, type: integrations.type, enabled: integrations.enabled, lastSyncedAt: integrations.lastSyncedAt }).from(integrations),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {
        projects: allProjects,
        revenueEntries: allRevenue,
        timeLogs: allTime,
        integrations: allIntegrations,
      },
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="indie-os-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (err) {
    console.error("[export]", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
