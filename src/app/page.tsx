import { db } from "@/db";
import { projects, revenueEntries, timeLogs, integrations, appSettings } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatMinutes } from "@/lib/utils";
import {
  FolderKanban,
  DollarSign,
  Clock,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AiCopilot } from "@/components/dashboard/ai-copilot";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TimeChart } from "@/components/dashboard/time-chart";
import { RevenueSourceChart } from "@/components/dashboard/revenue-source-chart";

interface HttpCachedData {
  status: "up" | "down" | "degraded";
}

async function getStats() {
  const allProjects = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  const activeCount = allProjects.filter((p) => p.status === "active").length;

  const mrrResult = await db
    .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
    .from(revenueEntries)
    .where(eq(revenueEntries.type, "mrr"));
  const totalMRR = mrrResult[0]?.total ?? 0;

  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthlyTimeResult = await db
    .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
    .from(timeLogs)
    .where(sql`${timeLogs.loggedAt} >= ${startOfMonth}`);
  const monthlyMinutes = monthlyTimeResult[0]?.total ?? 0;

  const httpProbes = await db
    .select({ id: integrations.id, projectId: integrations.projectId, cachedData: integrations.cachedData })
    .from(integrations)
    .where(eq(integrations.type, "http"));

  const probesSummary = httpProbes.map((p) => ({
    projectId: p.projectId,
    status: p.cachedData ? (JSON.parse(p.cachedData) as HttpCachedData).status : null,
  }));

  const hasOpenAiKey = !!(await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "openai_api_key"),
  }))?.value;

  // Revenue chart: last 6 months grouped by month
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

  const revenueByMonth = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${revenueEntries.recordedAt})`,
      revenue: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)`,
    })
    .from(revenueEntries)
    .where(sql`${revenueEntries.recordedAt} >= ${sixMonthsAgoStr}`)
    .groupBy(sql`strftime('%Y-%m', ${revenueEntries.recordedAt})`)
    .orderBy(sql`strftime('%Y-%m', ${revenueEntries.recordedAt})`);

  // Time chart: last 30 days by project
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const timeByProject = await db
    .select({
      project: projects.name,
      minutes: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)`,
    })
    .from(timeLogs)
    .leftJoin(projects, eq(timeLogs.projectId, projects.id))
    .where(sql`${timeLogs.loggedAt} >= ${thirtyDaysAgo}`)
    .groupBy(timeLogs.projectId)
    .orderBy(sql`sum(${timeLogs.minutes}) desc`)
    .limit(6);

  // Revenue by source (all time)
  const revenueBySource = await db
    .select({
      source: sql<string>`coalesce(${revenueEntries.source}, 'manual')`,
      amount: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)`,
    })
    .from(revenueEntries)
    .groupBy(sql`coalesce(${revenueEntries.source}, 'manual')`)
    .orderBy(sql`sum(${revenueEntries.amount}) desc`);

  const revenueChartData = revenueByMonth.map((r) => ({
    month: r.month,
    revenue: r.revenue,
  }));

  const timeChartData = timeByProject
    .filter((t) => t.project && t.minutes > 0)
    .map((t) => ({
      project: (t.project ?? "Unknown").slice(0, 14),
      hours: +(t.minutes / 60).toFixed(1),
    }));

  const revenueSourceData = revenueBySource
    .filter((r) => r.amount > 0)
    .map((r) => ({ source: r.source, amount: r.amount }));

  return {
    projects: allProjects,
    totalProjects: allProjects.length,
    activeCount,
    totalMRR,
    monthlyMinutes,
    probesSummary,
    hasOpenAiKey,
    revenueChartData,
    timeChartData,
    revenueSourceData,
  };
}

const statusVariant = {
  active: "success" as const,
  paused: "warning" as const,
  archived: "secondary" as const,
  idea: "outline" as const,
};

export default async function DashboardPage() {
  const t = await getTranslations("overview");
  const tp = await getTranslations("projects");
  const { projects: allProjects, totalProjects, activeCount, totalMRR, monthlyMinutes, probesSummary, hasOpenAiKey, revenueChartData, timeChartData, revenueSourceData } = await getStats();
  const recentProjects = allProjects.slice(0, 5);
  const upCount = probesSummary.filter((p) => p.status === "up").length;
  const downCount = probesSummary.filter((p) => p.status === "down" || p.status === "degraded").length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.projects")}
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCount} {t("stats.activeProjects")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.totalMRR")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMRR)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("stats.mrrSubtitle")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.timeThisMonth")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(monthlyMinutes)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("stats.timeSubtitle")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.avgROI")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyMinutes > 0
                ? `${formatCurrency(totalMRR / (monthlyMinutes / 60))}/h`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("stats.roiSubtitle")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {(revenueChartData.length > 0 || timeChartData.length > 0 || revenueSourceData.length > 1) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {revenueChartData.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <RevenueChart data={revenueChartData} />
              </CardContent>
            </Card>
          )}
          {timeChartData.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <TimeChart data={timeChartData} />
              </CardContent>
            </Card>
          )}
          {revenueSourceData.length > 1 && (
            <Card>
              <CardContent className="pt-5">
                <RevenueSourceChart data={revenueSourceData} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentProjects")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t("noProjects")}</p>
                <Link href="/projects" className="text-sm text-primary hover:underline mt-1">
                  {t("addFirstProject")}
                </Link>
              </div>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-sm font-medium hover:text-primary truncate block"
                    >
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                    )}
                  </div>
                  <Badge variant={statusVariant[project.status]} className="ml-3 shrink-0">
                    {tp(`status.${project.status}`)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{t("serviceHealth")}</CardTitle>
            <Link href="/services" className="text-xs text-primary hover:underline">{t("viewAll")}</Link>
          </CardHeader>
          <CardContent>
            {probesSummary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t("noServices")}</p>
                <Link href="/projects" className="text-sm text-primary hover:underline mt-1">
                  {t("addServices")}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-2xl font-bold">{upCount}</p>
                      <p className="text-xs text-muted-foreground">{t("servicesUp")}</p>
                    </div>
                  </div>
                  {downCount > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold text-destructive">{downCount}</p>
                        <p className="text-xs text-muted-foreground">{t("servicesDown")}</p>
                      </div>
                    </div>
                  )}
                </div>
                {downCount > 0 && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-xs text-destructive font-medium">{t("serviceAlert")}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AiCopilot hasOpenAiKey={hasOpenAiKey} />
    </div>
  );
}
