"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart, RefreshCw, Trash2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Integration } from "@/db/schema";
import { cn } from "@/lib/utils";

interface PlausibleData {
  visitors30d: number;
  pageviews30d: number;
  bounceRate: number;
  visitDuration: number;
  visitorsToday: number;
  syncedAt: string;
}

interface PlausibleIntegrationProps {
  projectId: number;
  integrations: Integration[];
}

function formatDuration(secs: number) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function PlausibleIntegration({
  projectId,
  integrations,
}: PlausibleIntegrationProps) {
  const ti = useTranslations("integrations");
  const tpl = useTranslations("plausible");
  const ts = useTranslations("services");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const plausibleIntegrations = integrations.filter((i) => i.type === "plausible");

  async function handleAdd() {
    if (!siteId.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: "plausible",
          config: {
            siteId: siteId.trim(),
            ...(baseUrl.trim() && { baseUrl: baseUrl.trim() }),
          },
        }),
      });
      setShowForm(false);
      setSiteId("");
      setBaseUrl("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleSync(id: number) {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/integrations/${id}/sync`, { method: "POST" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        alert(err.error ?? "Sync failed");
      }
      router.refresh();
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(ti("deleteConfirm"))) return;
    await fetch(`/api/integrations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart className="h-4 w-4" />
          Plausible Analytics
        </CardTitle>
        {plausibleIntegrations.length === 0 && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {ti("add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">{tpl("addDesc")}</p>
            <div className="space-y-2">
              <Label className="text-xs">{tpl("siteIdLabel")} *</Label>
              <Input
                placeholder="myapp.com"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{tpl("baseUrlLabel")}</Label>
              <Input
                placeholder="https://plausible.io"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">{tpl("baseUrlHint")}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding || !siteId.trim()}>
                {adding ? ti("submitting") : ti("submit")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setSiteId("");
                  setBaseUrl("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {plausibleIntegrations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {ts("noIntegrations")}
          </p>
        )}

        {plausibleIntegrations.map((integration) => {
          const config = JSON.parse(integration.config) as {
            siteId: string;
            baseUrl?: string;
          };
          const data = integration.cachedData
            ? (JSON.parse(integration.cachedData) as PlausibleData)
            : null;
          const isSyncing = syncingId === integration.id;

          return (
            <div key={integration.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{config.siteId}</span>
                  {config.baseUrl && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (self-hosted)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSync(integration.id)}
                    disabled={isSyncing}
                    className="h-7 px-2"
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
                    />
                    <span className="ml-1 text-xs">
                      {isSyncing ? ts("syncing") : ts("sync")}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(integration.id)}
                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {data ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{tpl("visitorsToday")}</p>
                    <p className="text-xl font-bold mt-1">{fmt(data.visitorsToday)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{tpl("visitors30d")}</p>
                    <p className="text-xl font-bold mt-1">{fmt(data.visitors30d)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{tpl("pageviews30d")}</p>
                    <p className="text-xl font-bold mt-1">{fmt(data.pageviews30d)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{tpl("bounceRate")}</p>
                    <p className="text-xl font-bold mt-1">{data.bounceRate}%</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">{tpl("visitDuration")}</p>
                    <p className="text-xl font-bold mt-1">{formatDuration(data.visitDuration)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">
                      {ts("lastSynced")}: {new Date(data.syncedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {ts("lastSynced")}: {ts("never")} —{" "}
                  <button
                    onClick={() => handleSync(integration.id)}
                    className="text-primary hover:underline"
                  >
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
