import { db } from "@/db";
import { integrations, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch, Activity, CheckCircle, XCircle, Clock, Circle,
  ExternalLink, Triangle, Wifi, CreditCard, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { SyncButton } from "./sync-button";
import { SyncAllButton } from "./sync-all-button";

interface GithubData {
  stars: number;
  openIssues: number;
  defaultBranch: string;
  htmlUrl: string | null;
  latestCommit: { sha: string; message: string; author: string; date: string; url: string } | null;
  latestRun: { status: string; conclusion: string | null; name: string; url: string } | null;
}

interface HttpData {
  status: "up" | "down" | "degraded";
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  checkedAt: string;
}

interface StripeData {
  mrr: number;
  currency: string;
  activeSubscriptions: number;
  totalCustomers: number;
  last30DaysRevenue: number;
  syncedAt: string;
}

interface VercelData {
  name: string;
  framework: string | null;
  productionUrl: string | null;
  latestDeployment: { uid: string; url: string; state: string; createdAt: number } | null;
}

function CIStatus({ run }: { run: GithubData["latestRun"] }) {
  if (!run) return <span className="text-xs text-muted-foreground">—</span>;
  const { conclusion, status } = run;
  if (status === "in_progress" || status === "queued")
    return <Badge variant="warning" className="gap-1 text-xs"><Clock className="h-3 w-3" /> In Progress</Badge>;
  if (conclusion === "success")
    return <Badge variant="success" className="gap-1 text-xs"><CheckCircle className="h-3 w-3" /> Passing</Badge>;
  if (conclusion === "failure" || conclusion === "timed_out")
    return <Badge variant="danger" className="gap-1 text-xs"><XCircle className="h-3 w-3" /> Failing</Badge>;
  return <Badge variant="outline" className="gap-1 text-xs"><Circle className="h-3 w-3" />{conclusion ?? status}</Badge>;
}

const vercelStateVariant: Record<string, "success" | "danger" | "warning" | "outline"> = {
  READY: "success", ERROR: "danger", BUILDING: "warning",
  QUEUED: "outline", INITIALIZING: "warning", CANCELED: "outline",
};

const vercelStateLabel: Record<string, string> = {
  READY: "Ready", ERROR: "Error", BUILDING: "Building",
  QUEUED: "Queued", INITIALIZING: "Init", CANCELED: "Canceled",
};

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
  const vercelRows = rows.filter((r) => r.type === "vercel");
  const httpRows = rows.filter((r) => r.type === "http");
  const stripeRows = rows.filter((r) => r.type === "stripe");
  const totalCount = rows.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        {totalCount > 0 && <SyncAllButton />}
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t("noIntegrations")}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t("noIntegrationsDesc")}</p>
          <Link href="/projects" className="text-sm text-primary hover:underline mt-3">
            Go to Projects →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* GitHub */}
          {githubRows.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                GitHub ({githubRows.length})
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {githubRows.map((row) => {
                  const config = JSON.parse(row.config) as { owner: string; repo: string };
                  const data = row.cachedData ? (JSON.parse(row.cachedData) as GithubData) : null;
                  return (
                    <Card key={row.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/projects/${row.projectId}`}
                              className="text-xs text-muted-foreground hover:text-primary">
                              {row.projectName}
                            </Link>
                            <CardTitle className="text-sm mt-0.5">
                              {data?.htmlUrl ? (
                                <a href={data.htmlUrl} target="_blank" rel="noopener noreferrer"
                                  className="hover:text-primary flex items-center gap-1 truncate">
                                  {config.owner}/{config.repo}
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="truncate block">{config.owner}/{config.repo}</span>
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
                                  <code className="text-muted-foreground mr-1">{data.latestCommit.sha}</code>
                                  {data.latestCommit.message}
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
            </section>
          )}

          {/* Vercel */}
          {vercelRows.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Triangle className="h-4 w-4" />
                Vercel ({vercelRows.length})
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vercelRows.map((row) => {
                  const config = JSON.parse(row.config) as { projectName: string };
                  const data = row.cachedData ? (JSON.parse(row.cachedData) as VercelData) : null;
                  const deployment = data?.latestDeployment;
                  return (
                    <Card key={row.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/projects/${row.projectId}`}
                              className="text-xs text-muted-foreground hover:text-primary">
                              {row.projectName}
                            </Link>
                            <CardTitle className="text-sm mt-0.5 flex items-center gap-1.5">
                              {data?.productionUrl ? (
                                <a href={data.productionUrl} target="_blank" rel="noopener noreferrer"
                                  className="hover:text-primary flex items-center gap-1 truncate">
                                  {config.projectName}
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="truncate">{config.projectName}</span>
                              )}
                              {data?.framework && (
                                <Badge variant="outline" className="text-xs shrink-0">{data.framework}</Badge>
                              )}
                            </CardTitle>
                          </div>
                          <SyncButton integrationId={row.id} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {data ? (
                          deployment ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{t("github.latestCommit").replace("Commit", "Deploy")}</span>
                                <Badge variant={vercelStateVariant[deployment.state] ?? "outline"} className="text-xs">
                                  {vercelStateLabel[deployment.state] ?? deployment.state}
                                </Badge>
                              </div>
                              <a href={deployment.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline block truncate">
                                {deployment.url}
                              </a>
                              <p className="text-xs text-muted-foreground">
                                {new Date(deployment.createdAt).toLocaleString()}
                              </p>
                              {row.lastSyncedAt && (
                                <p className="text-xs text-muted-foreground">
                                  {t("lastSynced")}: {new Date(row.lastSyncedAt).toLocaleString()}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">No deployments found</p>
                          )
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
            </section>
          )}
          {/* HTTP Probes */}
          {httpRows.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wifi className="h-4 w-4" />
                HTTP Probes ({httpRows.length})
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {httpRows.map((row) => {
                  const config = JSON.parse(row.config) as { url: string; label?: string; expectedStatus?: number };
                  const data = row.cachedData ? (JSON.parse(row.cachedData) as HttpData) : null;
                  const statusVariant = data?.status === "up" ? "success" : data?.status === "degraded" ? "warning" : "danger";
                  return (
                    <Card key={row.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/projects/${row.projectId}`}
                              className="text-xs text-muted-foreground hover:text-primary">
                              {row.projectName}
                            </Link>
                            <CardTitle className="text-sm mt-0.5 flex items-center gap-1.5">
                              {data?.status === "up" && <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                              {data?.status === "degraded" && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                              {data?.status === "down" && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                              <span className="truncate">{config.label || config.url}</span>
                            </CardTitle>
                          </div>
                          <SyncButton integrationId={row.id} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-xs text-muted-foreground truncate">{config.url}</p>
                        {data ? (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={statusVariant} className="text-xs">
                                {data.status === "up" ? "Up" : data.status === "degraded" ? "Degraded" : "Down"}
                              </Badge>
                              {data.statusCode && <span className="text-xs text-muted-foreground">HTTP {data.statusCode}</span>}
                              {data.responseTimeMs !== null && <span className="text-xs text-muted-foreground">{data.responseTimeMs}ms</span>}
                            </div>
                            {data.error && <p className="text-xs text-destructive truncate">{data.error}</p>}
                            <p className="text-xs text-muted-foreground">{t("lastSynced")}: {new Date(data.checkedAt).toLocaleString()}</p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t("lastSynced")}: {t("never")}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Stripe */}
          {stripeRows.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Stripe ({stripeRows.length})
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stripeRows.map((row) => {
                  const data = row.cachedData ? (JSON.parse(row.cachedData) as StripeData) : null;
                  const mrr = data ? (data.mrr / 100).toLocaleString("en-US", { style: "currency", currency: data.currency.toUpperCase() }) : null;
                  const rev30 = data ? (data.last30DaysRevenue / 100).toLocaleString("en-US", { style: "currency", currency: data.currency.toUpperCase() }) : null;
                  return (
                    <Card key={row.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/projects/${row.projectId}`}
                              className="text-xs text-muted-foreground hover:text-primary">
                              {row.projectName}
                            </Link>
                            <CardTitle className="text-sm mt-0.5">Stripe</CardTitle>
                          </div>
                          <SyncButton integrationId={row.id} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {data ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded bg-muted/50 px-2 py-1.5">
                                <p className="text-xs text-muted-foreground">MRR</p>
                                <p className="text-sm font-bold">{mrr}</p>
                              </div>
                              <div className="rounded bg-muted/50 px-2 py-1.5">
                                <p className="text-xs text-muted-foreground">30d Rev</p>
                                <p className="text-sm font-bold">{rev30}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {data.activeSubscriptions} subs · {data.totalCustomers} customers
                            </p>
                            <p className="text-xs text-muted-foreground">{t("lastSynced")}: {new Date(data.syncedAt).toLocaleString()}</p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t("lastSynced")}: {t("never")}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
