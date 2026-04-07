import { db } from "@/db";
import { projects, revenueEntries, timeLogs } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatMinutes } from "@/lib/utils";
import { Globe, GitBranch, Layers, DollarSign, Clock, TrendingUp, Zap } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
}

async function getSharedProject(token: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.shareToken, token),
  });
  if (!project) return null;

  const mrrResult = await db
    .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
    .from(revenueEntries)
    .where(eq(revenueEntries.projectId, project.id));
  const totalRevenue = mrrResult[0]?.total ?? 0;

  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const monthlyMinutesResult = await db
    .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
    .from(timeLogs)
    .where(eq(timeLogs.projectId, project.id));
  const totalMinutes = monthlyMinutesResult[0]?.total ?? 0;

  const monthlyMinutesResult2 = await db
    .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
    .from(timeLogs)
    .where(
      sql`${timeLogs.projectId} = ${project.id} AND ${timeLogs.loggedAt} >= ${startOfMonth}`
    );
  const monthlyMinutes = monthlyMinutesResult2[0]?.total ?? 0;

  const recentLogs = await db
    .select({ minutes: timeLogs.minutes, description: timeLogs.description, loggedAt: timeLogs.loggedAt })
    .from(timeLogs)
    .where(eq(timeLogs.projectId, project.id))
    .orderBy(desc(timeLogs.loggedAt))
    .limit(5);

  return { project, totalRevenue, totalMinutes, monthlyMinutes, recentLogs };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await getSharedProject(token);
  if (!data) return { title: "Project not found" };
  return {
    title: `${data.project.name} — built with indie-os`,
    description: data.project.description ?? `${data.project.name} is an indie project.`,
  };
}

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "outline" }> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  archived: { label: "Archived", variant: "secondary" },
  idea: { label: "Idea", variant: "outline" },
};

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const data = await getSharedProject(token);
  if (!data) notFound();

  const { project, totalRevenue, totalMinutes, monthlyMinutes, recentLogs } = data;
  const roiPerHour = totalMinutes > 0 ? totalRevenue / (totalMinutes / 60) : null;
  const statusCfg = statusConfig[project.status] ?? statusConfig.idea;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="https://github.com/qijinhaocode/indie-os" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">indie-os</span>
          </a>
          <p className="text-xs text-muted-foreground">Public project page</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Project header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant={statusCfg.variant} className="text-sm">{statusCfg.label}</Badge>
          </div>

          {project.description && (
            <p className="text-lg text-muted-foreground">{project.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            {project.domain && (
              <a href={project.domain.startsWith("http") ? project.domain : `https://${project.domain}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Globe className="h-3.5 w-3.5" />
                {project.domain}
              </a>
            )}
            {project.repo && (
              <a href={project.repo.startsWith("http") ? project.repo : `https://github.com/${project.repo}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                {project.repo}
              </a>
            )}
            {project.techStack && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Layers className="h-3.5 w-3.5" />
                {project.techStack}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Revenue</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total recorded</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Dev Time</span>
            </div>
            <p className="text-2xl font-bold">{formatMinutes(totalMinutes)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlyMinutes > 0 ? `${formatMinutes(monthlyMinutes)} this month` : "Total invested"}
            </p>
          </div>

          {roiPerHour !== null && (
            <div className="rounded-xl border border-border bg-card p-5 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">ROI</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(roiPerHour)}<span className="text-base font-normal text-muted-foreground">/hr</span></p>
              <p className="text-xs text-muted-foreground mt-1">Revenue per dev hour</p>
            </div>
          )}
        </div>

        {/* Recent activity */}
        {recentLogs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {recentLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{log.description ?? "Dev work"}</p>
                    <p className="text-xs text-muted-foreground">{log.loggedAt}</p>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground shrink-0">{formatMinutes(log.minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Built by an indie developer · Tracked with{" "}
            <a href="https://github.com/qijinhaocode/indie-os" target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline">indie-os</a>
          </p>
        </div>
      </main>
    </div>
  );
}
