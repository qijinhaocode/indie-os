import { db } from "@/db";
import { timeLogs, projects } from "@/db/schema";
import { sql, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { formatMinutes } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Plus, Download } from "lucide-react";
import { LogTimeDialog } from "./log-time-dialog";
import { DeleteEntryButton } from "../revenue/delete-entry-button";
import Link from "next/link";

export default async function TimePage() {
  const t = await getTranslations("time");

  const allProjects = await db.select().from(projects).orderBy(projects.name);

  const logs = await db
    .select({
      id: timeLogs.id,
      projectId: timeLogs.projectId,
      projectName: projects.name,
      minutes: timeLogs.minutes,
      description: timeLogs.description,
      loggedAt: timeLogs.loggedAt,
    })
    .from(timeLogs)
    .leftJoin(projects, eq(timeLogs.projectId, projects.id))
    .orderBy(desc(timeLogs.loggedAt));

  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthlyResult = await db
    .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
    .from(timeLogs)
    .where(sql`${timeLogs.loggedAt} >= ${startOfMonth}`);
  const monthlyMinutes = monthlyResult[0]?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <Link
              href="/api/export?type=time&format=csv"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("exportCsv")}</span>
            </Link>
          )}
          <LogTimeDialog projects={allProjects}>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("logTime")}</span>
              <span className="sm:hidden">{t("log")}</span>
            </button>
          </LogTimeDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalThisMonth")}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatMinutes(monthlyMinutes)}</div>
        </CardContent>
      </Card>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t("noLogs")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("noLogsDesc")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("form.project")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("form.hours")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">{t("form.description")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("form.date")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{log.projectName}</td>
                  <td className="px-4 py-3 font-mono">{formatMinutes(log.minutes)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-48 truncate">{log.description ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.loggedAt}</td>
                  <td className="px-4 py-3">
                    <DeleteEntryButton id={log.id} endpoint="time-logs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
