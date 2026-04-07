import { db } from "@/db";
import { appSettings, projects, revenueEntries, timeLogs, milestones } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Globe, GitBranch, DollarSign, Clock, Flag, Layers } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  archived: "bg-muted text-muted-foreground",
  idea: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokenRow = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "portfolio_token"),
  });
  if (!tokenRow?.value || tokenRow.value !== token) notFound();

  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(sql`CASE ${projects.status} WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'idea' THEN 2 ELSE 3 END`);

  const activeProjects = allProjects.filter((p) => p.status === "active");

  // Total MRR
  const mrrResult = await db
    .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
    .from(revenueEntries)
    .where(eq(revenueEntries.type, "mrr"));
  const totalMRR = mrrResult[0]?.total ?? 0;

  // Per-project stats
  const projectStats = await Promise.all(
    allProjects.map(async (p) => {
      const rev = await db
        .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
        .from(revenueEntries)
        .where(sql`${revenueEntries.projectId} = ${p.id} AND ${revenueEntries.type} = 'mrr'`);

      const time = await db
        .select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}), 0)` })
        .from(timeLogs)
        .where(eq(timeLogs.projectId, p.id));

      const mrr = rev[0]?.total ?? 0;
      const minutes = time[0]?.total ?? 0;
      const roi = minutes > 60 ? mrr / (minutes / 60) : null;

      return { ...p, mrr, minutes, roi };
    })
  );

  // Recent milestones across all projects
  const recentMilestones = await db
    .select()
    .from(milestones)
    .orderBy(desc(milestones.occurredAt))
    .limit(6);

  const milestoneProjectNames = Object.fromEntries(
    allProjects.map((p) => [p.id, p.name])
  );

  const now = new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">i</span>
            </div>
            <span className="font-semibold text-lg">indie-os portfolio</span>
          </div>
          <p className="text-muted-foreground text-sm mt-4">
            Updated {now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>

          {/* Summary stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-3xl font-bold">{activeProjects.length}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Active Projects</p>
            </div>
            {totalMRR > 0 && (
              <div>
                <p className="text-3xl font-bold">{formatCurrency(totalMRR)}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Total MRR</p>
              </div>
            )}
            <div>
              <p className="text-3xl font-bold">{allProjects.length}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Total Projects</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Projects */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Projects</h2>
          <div className="space-y-4">
            {projectStats.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{p.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {p.domain && (
                    <a
                      href={`https://${p.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {p.domain}
                    </a>
                  )}
                  {p.repo && (
                    <a
                      href={p.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      {p.repo.replace(/^https?:\/\/github\.com\//, "")}
                    </a>
                  )}
                  {p.techStack && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Layers className="h-3.5 w-3.5" />
                      {p.techStack}
                    </span>
                  )}
                </div>

                {(p.mrr > 0 || p.minutes > 0) && (
                  <div className="flex flex-wrap gap-4 pt-1 border-t border-border">
                    {p.mrr > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="font-semibold">{formatCurrency(p.mrr)}</span>
                        <span className="text-muted-foreground text-xs">MRR</span>
                      </div>
                    )}
                    {p.minutes > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-semibold">
                          {p.minutes >= 60
                            ? `${(p.minutes / 60).toFixed(0)}h`
                            : `${p.minutes}m`}
                        </span>
                        <span className="text-muted-foreground text-xs">invested</span>
                      </div>
                    )}
                    {p.roi !== null && p.roi > 0 && (
                      <div className="text-sm">
                        <span className="font-semibold">{formatCurrency(p.roi)}/h</span>
                        <span className="text-muted-foreground text-xs ml-1">ROI</span>
                      </div>
                    )}
                  </div>
                )}

                {p.shareToken && (
                  <div className="pt-1">
                    <Link
                      href={`/share/${p.shareToken}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View full project page →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Recent Milestones */}
        {recentMilestones.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Recent Milestones
            </h2>
            <div className="space-y-3">
              {recentMilestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <span className="text-xl shrink-0">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{m.occurredAt}</span>
                      {milestoneProjectNames[m.projectId] && (
                        <span className="text-xs text-muted-foreground">
                          · {milestoneProjectNames[m.projectId]}
                        </span>
                      )}
                      {m.description && (
                        <span className="text-xs text-muted-foreground">· {m.description}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://github.com/qijinhaocode/indie-os"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              indie-os
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
