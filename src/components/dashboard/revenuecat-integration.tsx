"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Smartphone, RefreshCw, Trash2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Integration } from "@/db/schema";
import { formatCurrency, cn } from "@/lib/utils";

interface RevenueCatData {
  mrr: number;
  activeSubscriptions: number;
  activeTrials: number;
  totalRevenue: number;
  currency: string;
  syncedAt: string;
}

interface RevenueCatIntegrationProps {
  projectId: number;
  integrations: Integration[];
}

export function RevenueCatIntegration({
  projectId,
  integrations,
}: RevenueCatIntegrationProps) {
  const ti = useTranslations("integrations");
  const trc = useTranslations("revenuecat");
  const ts = useTranslations("services");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [rcProjectId, setRcProjectId] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const rcIntegrations = integrations.filter((i) => i.type === "revenuecat");

  async function handleAdd() {
    if (!rcProjectId.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: "revenuecat",
          config: { projectId: rcProjectId.trim() },
        }),
      });
      setShowForm(false);
      setRcProjectId("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleSync(id: number) {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/integrations/${id}/sync`, {
        method: "POST",
      });
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
          <Smartphone className="h-4 w-4" />
          RevenueCat
        </CardTitle>
        {rcIntegrations.length === 0 && !showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {ti("add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">{trc("addDesc")}</p>
            <div className="space-y-2">
              <Label className="text-xs">{trc("projectIdLabel")}</Label>
              <Input
                placeholder="rcproj_xxxxxxxxxxxxxxxx"
                value={rcProjectId}
                onChange={(e) => setRcProjectId(e.target.value)}
                className="h-8 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">{trc("projectIdHint")}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={adding || !rcProjectId.trim()}
              >
                {adding ? ti("submitting") : ti("submit")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setRcProjectId("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {rcIntegrations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {ts("noIntegrations")}
          </p>
        )}

        {rcIntegrations.map((integration) => {
          const config = JSON.parse(integration.config) as {
            projectId: string;
          };
          const data = integration.cachedData
            ? (JSON.parse(integration.cachedData) as RevenueCatData)
            : null;
          const isSyncing = syncingId === integration.id;

          return (
            <div key={integration.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">RevenueCat</span>
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    {config.projectId}
                  </span>
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
                      className={cn(
                        "h-3.5 w-3.5",
                        isSyncing && "animate-spin"
                      )}
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
                    <p className="text-xs text-muted-foreground">MRR</p>
                    <p className="text-xl font-bold mt-1">
                      {formatCurrency(data.mrr, data.currency)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      {trc("totalRevenue")}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {formatCurrency(data.totalRevenue, data.currency)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      {trc("activeSubscriptions")}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {data.activeSubscriptions}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      {trc("activeTrials")}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {data.activeTrials}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">
                      {ts("lastSynced")}:{" "}
                      {new Date(data.syncedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ✓ {trc("autoLogged")}
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
