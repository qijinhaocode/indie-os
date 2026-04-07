"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Citrus, RefreshCw, Trash2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Integration } from "@/db/schema";
import { formatCurrency, cn } from "@/lib/utils";

interface LemonSqueezyData {
  mrr: number;
  activeSubscriptions: number;
  totalCustomers: number;
  totalRevenue: number;
  currency: string;
  syncedAt: string;
}

interface LemonSqueezyIntegrationProps {
  projectId: number;
  integrations: Integration[];
}

export function LemonSqueezyIntegration({
  projectId,
  integrations,
}: LemonSqueezyIntegrationProps) {
  const ti = useTranslations("integrations");
  const tls = useTranslations("lemonsqueezy");
  const ts = useTranslations("services");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const lsIntegrations = integrations.filter((i) => i.type === "lemonsqueezy");

  async function handleAdd() {
    setAdding(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: "lemonsqueezy",
          config: { storeId: storeId.trim() || undefined },
        }),
      });
      setShowForm(false);
      setStoreId("");
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
          <Citrus className="h-4 w-4" />
          Lemon Squeezy
        </CardTitle>
        {lsIntegrations.length === 0 && !showForm && (
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
            <p className="text-sm text-muted-foreground">{tls("addDesc")}</p>
            <div className="space-y-2">
              <Label className="text-xs">{tls("storeIdLabel")}</Label>
              <Input
                placeholder="12345"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">{tls("storeIdHint")}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding}>
                {adding ? ti("submitting") : ti("submit")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setStoreId("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {lsIntegrations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {ts("noIntegrations")}
          </p>
        )}

        {lsIntegrations.map((integration) => {
          const config = JSON.parse(integration.config) as {
            storeId?: string;
          };
          const data = integration.cachedData
            ? (JSON.parse(integration.cachedData) as LemonSqueezyData)
            : null;
          const isSyncing = syncingId === integration.id;

          return (
            <div key={integration.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Lemon Squeezy</span>
                  {config.storeId && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Store #{config.storeId}
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
                      {tls("totalRevenue")}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {formatCurrency(data.totalRevenue, data.currency)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      {tls("activeSubscriptions")}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {data.activeSubscriptions}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      {tls("totalOrders")}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {data.totalCustomers}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">
                      {ts("lastSynced")}:{" "}
                      {new Date(data.syncedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ✓ {tls("autoLogged")}
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
