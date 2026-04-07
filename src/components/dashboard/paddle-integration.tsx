"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Anchor, RefreshCw, Trash2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Integration } from "@/db/schema";
import { formatCurrency, cn } from "@/lib/utils";

interface PaddleData {
  mrr: number;
  activeSubscriptions: number;
  totalTransactions: number;
  currency: string;
  syncedAt: string;
}

interface PaddleIntegrationProps {
  projectId: number;
  integrations: Integration[];
}

export function PaddleIntegration({ projectId, integrations }: PaddleIntegrationProps) {
  const ti = useTranslations("integrations");
  const tp = useTranslations("paddle");
  const ts = useTranslations("services");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const paddleIntegrations = integrations.filter((i) => i.type === "paddle");

  async function handleAdd() {
    setAdding(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: "paddle",
          config: { sandbox },
        }),
      });
      setShowForm(false);
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
          <Anchor className="h-4 w-4" />
          Paddle
        </CardTitle>
        {paddleIntegrations.length === 0 && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {ti("add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">{tp("addDesc")}</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={sandbox}
                onChange={(e) => setSandbox(e.target.checked)}
                className="rounded"
              />
              {tp("sandbox")}
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding}>
                {adding ? ti("submitting") : ti("submit")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {paddleIntegrations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {ts("noIntegrations")}
          </p>
        )}

        {paddleIntegrations.map((integration) => {
          const config = JSON.parse(integration.config) as { sandbox?: boolean };
          const data = integration.cachedData
            ? (JSON.parse(integration.cachedData) as PaddleData)
            : null;
          const isSyncing = syncingId === integration.id;

          return (
            <div key={integration.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Paddle</span>
                  {config.sandbox && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5">
                      Sandbox
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
                    <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
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
                      {tp("activeSubscriptions")}
                    </p>
                    <p className="text-xl font-bold mt-1">{data.activeSubscriptions}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">{tp("totalTransactions")}</p>
                    <p className="text-xl font-bold mt-1">{data.totalTransactions}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">
                      {ts("lastSynced")}: {new Date(data.syncedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ✓ {tp("autoLogged")}
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
