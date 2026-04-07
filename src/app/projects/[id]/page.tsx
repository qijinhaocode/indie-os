import { db } from "@/db";
import { projects, revenueEntries, timeLogs, integrations, uptimeHistory, kpiMetrics, kpiValues, milestones } from "@/db/schema";
import { eq, sql, desc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMinutes } from "@/lib/utils";
import { GitBranch, Globe, Layers, DollarSign, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { EditProjectForm } from "./edit-project-form";
import { DeleteProjectButton } from "./delete-project-button";
import { GithubIntegration } from "@/components/dashboard/github-integration";
import { VercelIntegration } from "@/components/dashboard/vercel-integration";
import { HttpProbeIntegration } from "@/components/dashboard/http-probe-integration";
import { StripeIntegration } from "@/components/dashboard/stripe-integration";
import { RevenueCatIntegration } from "@/components/dashboard/revenuecat-integration";
import { LemonSqueezyIntegration } from "@/components/dashboard/lemonsqueezy-integration";
import { KpiTracker } from "@/components/dashboard/kpi-tracker";
import { MilestoneLog } from "@/components/dashboard/milestone-log";
import { ShareButton } from "./share-button";

const statusVariant = {
  active: "success" as const,
  paused: "warning" as const,
  archived: "secondary" as const,
  idea: "outline" as const,
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("projects");

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, parseInt(id)),
  });

  if (!project) notFound();

  const mrrResult = await db
    .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
    .from(revenueEntries)
    .where(eq(revenueEntries.projectId, project.id));
  const projectMRR = mrrResult[0]?.total ?? 0;

  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const timeResult = await db
    .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
    .from(timeLogs)
    .where(eq(timeLogs.projectId, project.id));
  const totalMinutes = timeResult[0]?.total ?? 0;

  const monthlyTimeResult = await db
    .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
    .from(timeLogs)
    .where(sql`${timeLogs.projectId} = ${project.id} AND ${timeLogs.loggedAt} >= ${startOfMonth}`);
  const monthlyMinutes = monthlyTimeResult[0]?.total ?? 0;

  const projectIntegrations = await db
    .select()
    .from(integrations)
    .where(eq(integrations.projectId, project.id));

  // Fetch uptime history for HTTP probes
  const httpProbeIds = projectIntegrations
    .filter((i) => i.type === "http")
    .map((i) => i.id);

  const historyByIntegration: Record<number, { status: string; checkedAt: string }[]> = {};
  if (httpProbeIds.length > 0) {
    const rows = await db
      .select({
        integrationId: uptimeHistory.integrationId,
        status: uptimeHistory.status,
        checkedAt: uptimeHistory.checkedAt,
      })
      .from(uptimeHistory)
      .where(inArray(uptimeHistory.integrationId, httpProbeIds))
      .orderBy(desc(uptimeHistory.checkedAt))
      .limit(httpProbeIds.length * 90);

    for (const row of rows) {
      if (!historyByIntegration[row.integrationId]) {
        historyByIntegration[row.integrationId] = [];
      }
      if (historyByIntegration[row.integrationId].length < 90) {
        historyByIntegration[row.integrationId].push({
          status: row.status,
          checkedAt: row.checkedAt,
        });
      }
    }
  }

  // KPI metrics with latest values
  const projectKpiMetrics = await db
    .select()
    .from(kpiMetrics)
    .where(eq(kpiMetrics.projectId, project.id))
    .orderBy(kpiMetrics.createdAt);

  const metricsWithValues = await Promise.all(
    projectKpiMetrics.map(async (m) => {
      const values = await db
        .select()
        .from(kpiValues)
        .where(eq(kpiValues.metricId, m.id))
        .orderBy(desc(kpiValues.recordedAt))
        .limit(90);
      return { ...m, values };
    })
  );

  // Milestones
  const projectMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, project.id))
    .orderBy(desc(milestones.occurredAt));

  const recentRevenue = await db
    .select()
    .from(revenueEntries)
    .where(eq(revenueEntries.projectId, project.id))
    .orderBy(desc(revenueEntries.recordedAt))
    .limit(5);

  const recentTime = await db
    .select()
    .from(timeLogs)
    .where(eq(timeLogs.projectId, project.id))
    .orderBy(desc(timeLogs.loggedAt))
    .limit(5);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("backToProjects")}
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant={statusVariant[project.status]}>
              {t(`status.${project.status}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {project.description || t("noDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ShareButton projectId={project.id} currentToken={project.shareToken ?? null} />
          <EditProjectForm project={project} />
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(projectMRR)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("form.name") === "Project Name" ? "Total Time" : "累计耗时"}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(totalMinutes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("form.name") === "Project Name" ? "This Month" : "本月耗时"}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(monthlyMinutes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalMinutes > 0 ? `${formatCurrency(projectMRR / (totalMinutes / 60))}/h` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.repo && (
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={project.repo} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline truncate">
                  {project.repo}
                </a>
              </div>
            )}
            {project.domain && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`https://${project.domain}`} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline">
                  {project.domain}
                </a>
              </div>
            )}
            {project.techStack && (
              <div className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{project.techStack}</span>
              </div>
            )}
            {!project.repo && !project.domain && !project.techStack && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {t("form.name") === "Project Name" ? "Recent Revenue" : "最近收入"}
            </CardTitle>
            <Link href="/revenue" className="text-xs text-primary hover:underline">
              {t("form.name") === "Project Name" ? "View all →" : "查看全部 →"}
            </Link>
          </CardHeader>
          <CardContent>
            {recentRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">—</p>
            ) : (
              <div className="space-y-0">
                {recentRevenue.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm font-medium">{formatCurrency(entry.amount, entry.currency)}</span>
                      {entry.source && (
                        <span className="text-xs text-muted-foreground ml-2">{entry.source}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">{entry.type}</Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.recordedAt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Time Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {t("form.name") === "Project Name" ? "Recent Time Logs" : "最近时间记录"}
            </CardTitle>
            <Link href="/time" className="text-xs text-primary hover:underline">
              {t("form.name") === "Project Name" ? "View all →" : "查看全部 →"}
            </Link>
          </CardHeader>
          <CardContent>
            {recentTime.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">—</p>
            ) : (
              <div className="space-y-0">
                {recentTime.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm font-medium">{formatMinutes(log.minutes)}</span>
                      {log.description && (
                        <span className="text-xs text-muted-foreground ml-2">{log.description}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{log.loggedAt}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <GithubIntegration projectId={project.id} integrations={projectIntegrations} />
        <VercelIntegration projectId={project.id} integrations={projectIntegrations} />
        <HttpProbeIntegration projectId={project.id} integrations={projectIntegrations} uptimeHistoryByIntegration={historyByIntegration} />
        <StripeIntegration projectId={project.id} integrations={projectIntegrations} />
        <RevenueCatIntegration projectId={project.id} integrations={projectIntegrations} />
        <LemonSqueezyIntegration projectId={project.id} integrations={projectIntegrations} />
        <KpiTracker projectId={project.id} metrics={metricsWithValues} />
        <MilestoneLog projectId={project.id} milestones={projectMilestones} />
      </div>
    </div>
  );
}
