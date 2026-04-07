"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Triangle, RefreshCw, Trash2, Plus, X, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Integration } from "@/db/schema";
import { cn } from "@/lib/utils";

interface VercelData {
  name: string;
  framework: string | null;
  productionUrl: string | null;
  latestDeployment: {
    uid: string;
    url: string;
    state: string;
    createdAt: number;
  } | null;
}

const stateVariant: Record<string, "success" | "danger" | "warning" | "outline"> = {
  READY: "success",
  ERROR: "danger",
  BUILDING: "warning",
  QUEUED: "outline",
  INITIALIZING: "warning",
  CANCELED: "outline",
};

interface VercelIntegrationProps {
  projectId: number;
  integrations: Integration[];
}

export function VercelIntegration({ projectId, integrations }: VercelIntegrationProps) {
  const t = useTranslations("integrations");
  const tv = useTranslations("vercel");
  const ts = useTranslations("services");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const vercelIntegrations = integrations.filter((i) => i.type === "vercel");

  async function handleAdd() {
    if (!projectName) return;
    setAdding(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: "vercel",
          config: { projectName, teamId: teamId || undefined },
        }),
      });
      setShowForm(false);
      setProjectName("");
      setTeamId("");
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
          <Triangle className="h-4 w-4" />
          Vercel
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
            <div className="space-y-1.5">
              <Label>{t("vercelProject")} *</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t("vercelProjectPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("vercelTeam")}</Label>
              <Input
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder={t("vercelTeamPlaceholder")}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding || !projectName}>
                {adding ? t("submitting") : t("submit")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {vercelIntegrations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {ts("noIntegrations")}
          </p>
        )}

        {vercelIntegrations.map((integration) => {
          const config = JSON.parse(integration.config) as { projectName: string; teamId?: string };
          const data = integration.cachedData ? (JSON.parse(integration.cachedData) as VercelData) : null;
          const isSyncing = syncingId === integration.id;
          const deployment = data?.latestDeployment;

          return (
            <div key={integration.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data?.productionUrl ? (
                    <a href={data.productionUrl} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-sm hover:text-primary flex items-center gap-1">
                      {config.projectName}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-medium text-sm">{config.projectName}</span>
                  )}
                  {data?.framework && (
                    <Badge variant="outline" className="text-xs">{data.framework}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => handleSync(integration.id)}
                    disabled={isSyncing} className="h-7 px-2">
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
                deployment ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{tv("latestDeployment")}</span>
                      <Badge variant={stateVariant[deployment.state] ?? "outline"}>
                        {tv(`state.${deployment.state}` as Parameters<typeof tv>[0]) ?? deployment.state}
                      </Badge>
                    </div>
                    <a href={deployment.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline block truncate">
                      {deployment.url}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {new Date(deployment.createdAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No deployments found</p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  {ts("lastSynced")}: {ts("never")} —{" "}
                  <button onClick={() => handleSync(integration.id)} className="text-primary hover:underline">
                    {ts("sync")}
                  </button>
                </p>
              )}

              {integration.lastSyncedAt && (
                <p className="text-xs text-muted-foreground">
                  {ts("lastSynced")}: {new Date(integration.lastSyncedAt).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
