import { db } from "@/db";
import { integrations, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Activity, CheckCircle, XCircle, Clock, Circle, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { SyncButton } from "./sync-button";

interface GithubData {
  stars: number;
  openIssues: number;
  defaultBranch: string;
  htmlUrl: string | null;
  latestCommit: { sha: string; message: string; author: string; date: string; url: string } | null;
  latestRun: { status: string; conclusion: string | null; name: string; url: string } | null;
}

function CIStatus({ run }: { run: GithubData["latestRun"] }) {
  if (!run) return <span className="text-xs text-muted-foreground">—</span>;
  const { conclusion, status } = run;

  if (status === "in_progress" || status === "queued") {
    return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> In Progress</Badge>;
  }
  if (conclusion === "success") {
    return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Passing</Badge>;
  }
  if (conclusion === "failure" || conclusion === "timed_out") {
    return <Badge variant="danger" className="gap-1"><XCircle className="h-3 w-3" /> Failing</Badge>;
  }
  return <Badge variant="outline" className="gap-1"><Circle className="h-3 w-3" />{conclusion ?? status}</Badge>;
}

export default async function ServicesPage() {
  const t = await getTranslations("services");

  const rows = await db
    .select({
      id: integrations.id,
      projectId: integrations.projectId,
      projectName: projects.name,
      type: integrations.type,
      config: integrations.config,
      cachedData: integrations.cachedData,
      lastSyncedAt: integrations.lastSyncedAt,
      enabled: integrations.enabled,
    })
    .from(integrations)
    .leftJoin(projects, eq(integrations.projectId, projects.id))
    .orderBy(desc(integrations.createdAt));

  const githubRows = rows.filter((r) => r.type === "github");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {githubRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t("noIntegrations")}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t("noIntegrationsDesc")}</p>
          <Link href="/projects" className="text-sm text-primary hover:underline mt-3">
            Go to Projects →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <GitBranch className="h-4 w-4" />
            GitHub ({githubRows.length})
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {githubRows.map((row) => {
              const config = JSON.parse(row.config) as { owner: string; repo: string };
              const data = row.cachedData ? (JSON.parse(row.cachedData) as GithubData) : null;

              return (
                <Card key={row.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/projects/${row.projectId}`}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors">
                          {row.projectName}
                        </Link>
                        <CardTitle className="text-sm mt-0.5 flex items-center gap-1.5">
                          {data?.htmlUrl ? (
                            <a href={data.htmlUrl} target="_blank" rel="noopener noreferrer"
                              className="hover:text-primary flex items-center gap-1 truncate">
                              {config.owner}/{config.repo}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="truncate">{config.owner}/{config.repo}</span>
                          )}
                        </CardTitle>
                      </div>
                      <SyncButton integrationId={row.id} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data ? (
                      <>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>⭐ {data.stars}</span>
                          <span>🐛 {data.openIssues}</span>
                          <span>🌿 {data.defaultBranch}</span>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t("github.ciStatus")}</p>
                          <CIStatus run={data.latestRun} />
                        </div>

                        {data.latestCommit && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t("github.latestCommit")}</p>
                            <a href={data.latestCommit.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs hover:text-primary line-clamp-1">
                              <code className="text-muted-foreground">{data.latestCommit.sha}</code>
                              {" "}{data.latestCommit.message}
                            </a>
                          </div>
                        )}

                        {row.lastSyncedAt && (
                          <p className="text-xs text-muted-foreground">
                            {t("lastSynced")}: {new Date(row.lastSyncedAt).toLocaleString()}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("lastSynced")}: {t("never")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
