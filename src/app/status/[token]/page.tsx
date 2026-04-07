import { db } from "@/db";
import { integrations, projects, appSettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CheckCircle, XCircle, AlertCircle, Clock, Zap, RefreshCw } from "lucide-react";
import type { Metadata } from "next";

interface HttpData {
  status: "up" | "down" | "degraded";
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  checkedAt: string;
}

interface Props {
  params: Promise<{ token: string }>;
}

async function getData(token: string) {
  const tokenRow = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "status_page_token"),
  });
  if (!tokenRow?.value || tokenRow.value !== token) return null;

  const rows = await db
    .select({
      id: integrations.id,
      projectId: integrations.projectId,
      projectName: projects.name,
      config: integrations.config,
      cachedData: integrations.cachedData,
      lastSyncedAt: integrations.lastSyncedAt,
      enabled: integrations.enabled,
    })
    .from(integrations)
    .leftJoin(projects, eq(integrations.projectId, projects.id))
    .where(eq(integrations.type, "http"))
    .orderBy(desc(integrations.createdAt));

  return rows;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await getData(token);
  if (!data) return { title: "Status Page" };
  const downCount = data.filter((r) => {
    const d = r.cachedData ? (JSON.parse(r.cachedData) as HttpData) : null;
    return d?.status !== "up";
  }).length;
  return {
    title: downCount > 0 ? `⚠️ ${downCount} issue(s) — Status` : "✅ All Systems Operational — Status",
  };
}

function StatusDot({ status }: { status: HttpData["status"] | null }) {
  if (!status) return <div className="h-3 w-3 rounded-full bg-muted" />;
  if (status === "up") return <div className="h-3 w-3 rounded-full bg-emerald-500" />;
  if (status === "degraded") return <div className="h-3 w-3 rounded-full bg-amber-500" />;
  return <div className="h-3 w-3 rounded-full bg-red-500" />;
}

function StatusIcon({ status }: { status: HttpData["status"] | null }) {
  if (!status) return <Clock className="h-5 w-5 text-muted-foreground" />;
  if (status === "up") return <CheckCircle className="h-5 w-5 text-emerald-500" />;
  if (status === "degraded") return <AlertCircle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

export default async function StatusPage({ params }: Props) {
  const { token } = await params;
  const rows = await getData(token);
  if (!rows) notFound();

  const grouped = rows.reduce<Record<string, typeof rows>>((acc, row) => {
    const key = row.projectName ?? `Project #${row.projectId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const allData = rows.map((r) =>
    r.cachedData ? (JSON.parse(r.cachedData) as HttpData) : null
  );
  const upCount = allData.filter((d) => d?.status === "up").length;
  const downCount = allData.filter((d) => d?.status === "down").length;
  const degradedCount = allData.filter((d) => d?.status === "degraded").length;
  const unknownCount = allData.filter((d) => !d).length;
  const isAllGood = rows.length > 0 && downCount === 0 && degradedCount === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">indie-os</span>
          </div>
          <p className="text-xs text-muted-foreground">Status Page</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Overall status banner */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/30 px-6 py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-xl font-semibold">No monitors configured</h1>
            <p className="text-sm text-muted-foreground mt-1">Add HTTP probes from a project page to display them here.</p>
          </div>
        ) : isAllGood ? (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-6 py-6 flex items-center gap-4">
            <CheckCircle className="h-9 w-9 text-emerald-500 shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">All Systems Operational</h1>
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-0.5">
                {upCount} service{upCount !== 1 ? "s" : ""} monitored · All up
              </p>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border px-6 py-6 flex items-center gap-4 ${
            downCount > 0
              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
          }`}>
            {downCount > 0
              ? <XCircle className="h-9 w-9 text-red-500 shrink-0" />
              : <AlertCircle className="h-9 w-9 text-amber-500 shrink-0" />}
            <div>
              <h1 className={`text-xl font-bold ${downCount > 0 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                {downCount > 0 ? "Service Disruption" : "Partial Degradation"}
              </h1>
              <p className={`text-sm mt-0.5 ${downCount > 0 ? "text-red-600 dark:text-red-500" : "text-amber-600 dark:text-amber-500"}`}>
                {[
                  downCount > 0 && `${downCount} down`,
                  degradedCount > 0 && `${degradedCount} degraded`,
                  upCount > 0 && `${upCount} up`,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        )}

        {/* Services grouped by project */}
        {Object.entries(grouped).map(([projectName, probes]) => (
          <section key={projectName} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              {projectName}
            </h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              {probes.map((probe) => {
                const config = JSON.parse(probe.config) as { url: string; label?: string };
                const data = probe.cachedData ? (JSON.parse(probe.cachedData) as HttpData) : null;

                return (
                  <div key={probe.id} className="flex items-center justify-between px-5 py-4 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusIcon status={data?.status ?? null} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {config.label || config.url}
                        </p>
                        {config.label && (
                          <p className="text-xs text-muted-foreground truncate">{config.url}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      {data ? (
                        <>
                          <div className="hidden sm:block text-right">
                            {data.responseTimeMs !== null && (
                              <p className="text-xs text-muted-foreground">{data.responseTimeMs}ms</p>
                            )}
                            {data.statusCode && (
                              <p className="text-xs text-muted-foreground">HTTP {data.statusCode}</p>
                            )}
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            data.status === "up"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                              : data.status === "degraded"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          }`}>
                            {data.status === "up" ? "Operational" : data.status === "degraded" ? "Degraded" : "Down"}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                          No data
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Summary stats */}
        {rows.length > 0 && (
          <div className="flex items-center justify-center gap-6 py-2 text-xs text-muted-foreground">
            {upCount > 0 && (
              <span className="flex items-center gap-1.5">
                <StatusDot status="up" /> {upCount} operational
              </span>
            )}
            {degradedCount > 0 && (
              <span className="flex items-center gap-1.5">
                <StatusDot status="degraded" /> {degradedCount} degraded
              </span>
            )}
            {downCount > 0 && (
              <span className="flex items-center gap-1.5">
                <StatusDot status="down" /> {downCount} down
              </span>
            )}
            {unknownCount > 0 && (
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-muted" /> {unknownCount} no data
              </span>
            )}
          </div>
        )}

        {/* Last updated */}
        {rows.some((r) => r.lastSyncedAt) && (
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Last synced:{" "}
            {new Date(
              rows
                .filter((r) => r.lastSyncedAt)
                .sort((a, b) => new Date(b.lastSyncedAt!).getTime() - new Date(a.lastSyncedAt!).getTime())[0]?.lastSyncedAt ?? ""
            ).toLocaleString()}
          </p>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <a href="https://github.com/qijinhaocode/indie-os" target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline">indie-os</a>
          </p>
        </div>
      </main>
    </div>
  );
}
