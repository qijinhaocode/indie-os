"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GitBranch, RefreshCw, Trash2, Plus, X, ExternalLink, CheckCircle, XCircle, Clock, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Integration } from "@/db/schema";
import { cn } from "@/lib/utils";

interface GithubData {
  stars: number;
  openIssues: number;
  defaultBranch: string;
  description: string | null;
  htmlUrl: string | null;
  latestCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
  } | null;
  latestRun: {
    status: string;
    conclusion: string | null;
    name: string;
    url: string;
    updatedAt: string;
  } | null;
}

function CIStatusIcon({ conclusion, status }: { conclusion: string | null; status: string }) {
  if (status === "in_progress" || status === "queued") {
    return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
  }
  if (conclusion === "success") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (conclusion === "failure" || conclusion === "timed_out") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function CIBadgeVariant(conclusion: string | null, status: string): "success" | "warning" | "danger" | "outline" {
  if (status === "in_progress" || status === "queued") return "warning";
  if (conclusion === "success") return "success";
  if (conclusion === "failure" || conclusion === "timed_out") return "danger";
  return "outline";
}

interface GithubIntegrationProps {
  projectId: number;
  integrations: Integration[];
}

export function GithubIntegration({ projectId, integrations }: GithubIntegrationProps) {
  const t = useTranslations("integrations");
  const ts = useTranslations("services");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const githubIntegrations = integrations.filter((i) => i.type === "github");

  async function handleAdd() {
    if (!owner || !repo) return;
    setAdding(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: "github", config: { owner, repo } }),
      });
      setShowForm(false);
      setOwner("");
      setRepo("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleSync(id: number) {
    setSyncingId(id);
    try {
      await fetch(`/api/integrations/${id}/sync`, { method: "POST" });
      router.refresh();
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/integrations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          GitHub
        </CardTitle>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("owner")}</Label>
                <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder={t("ownerPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("repo")}</Label>
                <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder={t("repoPlaceholder")} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding || !owner || !repo}>
                {adding ? t("submitting") : t("submit")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {githubIntegrations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {ts("noIntegrations")}
          </p>
        )}

        {githubIntegrations.map((integration) => {
          const config = JSON.parse(integration.config) as { owner: string; repo: string };
          const data = integration.cachedData ? (JSON.parse(integration.cachedData) as GithubData) : null;
          const isSyncing = syncingId === integration.id;

          return (
            <div key={integration.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data?.htmlUrl ? (
                    <a href={data.htmlUrl} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-sm hover:text-primary flex items-center gap-1">
                      {config.owner}/{config.repo}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-medium text-sm">{config.owner}/{config.repo}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => handleSync(integration.id)} disabled={isSyncing}
                    className="h-7 px-2">
                    <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                    <span className="ml-1 text-xs">{isSyncing ? ts("syncing") : ts("sync")}</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(integration.id)}
                    className="h-7 px-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {data ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>⭐ {data.stars}</span>
                    <span>🐛 {data.openIssues} issues</span>
                    <span>🌿 {data.defaultBranch}</span>
                  </div>

                  {data.latestCommit && (
                    <div className="rounded-md bg-muted/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-0.5">{ts("github.latestCommit")}</p>
                      <a href={data.latestCommit.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium hover:text-primary line-clamp-1">
                        <code className="text-xs text-muted-foreground mr-1.5">{data.latestCommit.sha}</code>
                        {data.latestCommit.message}
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {data.latestCommit.author} · {new Date(data.latestCommit.date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {data.latestRun ? (
                    <div className="flex items-center gap-2">
                      <CIStatusIcon conclusion={data.latestRun.conclusion} status={data.latestRun.status} />
                      <a href={data.latestRun.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs hover:text-primary">
                        {data.latestRun.name}
                      </a>
                      <Badge variant={CIBadgeVariant(data.latestRun.conclusion, data.latestRun.status)}
                        className="text-xs ml-auto">
                        {data.latestRun.conclusion ?? data.latestRun.status}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{ts("github.noRuns")}</p>
                  )}

                  {integration.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      {ts("lastSynced")}: {new Date(integration.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {ts("lastSynced")}: {ts("never")} — {" "}
                  <button onClick={() => handleSync(integration.id)} className="text-primary hover:underline">
                    {ts("sync")}
                  </button>
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
