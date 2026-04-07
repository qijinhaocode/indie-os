"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wifi, RefreshCw, Trash2, Plus, X, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Integration } from "@/db/schema";
import { cn } from "@/lib/utils";

interface HttpData {
  status: "up" | "down" | "degraded";
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  checkedAt: string;
}

function StatusIcon({ status }: { status: HttpData["status"] }) {
  if (status === "up") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === "degraded") return <AlertCircle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

const statusVariant: Record<HttpData["status"], "success" | "warning" | "danger"> = {
  up: "success",
  degraded: "warning",
  down: "danger",
};

interface UptimeDot {
  status: string;
  checkedAt: string;
}

interface HttpProbeIntegrationProps {
  projectId: number;
  integrations: Integration[];
  uptimeHistoryByIntegration?: Record<number, UptimeDot[]>;
}

function UptimeDots({ history }: { history: UptimeDot[] }) {
  if (history.length === 0) return null;
  const dots = [...history].reverse(); // oldest first
  const upCount = history.filter((h) => h.status === "up").length;
  const uptimePct = history.length > 0 ? Math.round((upCount / history.length) * 100) : 100;

  return (
    <div className="space-y-1">
      <div className="flex gap-0.5 flex-wrap">
        {dots.map((d, i) => (
          <div
            key={i}
            title={`${d.status} · ${new Date(d.checkedAt).toLocaleString()}`}
            className={cn(
              "h-3 w-3 rounded-sm",
              d.status === "up"
                ? "bg-emerald-500"
                : d.status === "degraded"
                ? "bg-amber-400"
                : "bg-red-500"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {uptimePct}% uptime · {history.length} checks
      </p>
    </div>
  );
}

export function HttpProbeIntegration({ projectId, integrations, uptimeHistoryByIntegration = {} }: HttpProbeIntegrationProps) {
  const ti = useTranslations("integrations");
  const th = useTranslations("http");
  const ts = useTranslations("services");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [expectedStatus, setExpectedStatus] = useState("200");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const httpIntegrations = integrations.filter((i) => i.type === "http");

  async function handleAdd() {
    if (!url) return;
    setAdding(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: "http",
          config: { url, method, expectedStatus: parseInt(expectedStatus), label: label || url },
        }),
      });
      setShowForm(false);
      setUrl("");
      setLabel("");
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
    if (!confirm(ti("deleteConfirm"))) return;
    await fetch(`/api/integrations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          {th("title")}
        </CardTitle>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {ti("add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label>{th("label")}</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={th("labelPlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{th("url")} *</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.myapp.com/health" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{th("method")}</Label>
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="GET">GET</option>
                  <option value="HEAD">HEAD</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{th("expectedStatus")}</Label>
                <Input value={expectedStatus} onChange={(e) => setExpectedStatus(e.target.value)} placeholder="200" type="number" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding || !url}>
                {adding ? ti("submitting") : ti("submit")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {httpIntegrations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">{ts("noIntegrations")}</p>
        )}

        {httpIntegrations.map((integration) => {
          const config = JSON.parse(integration.config) as { url: string; label?: string; expectedStatus?: number };
          const data = integration.cachedData ? (JSON.parse(integration.cachedData) as HttpData) : null;
          const isSyncing = syncingId === integration.id;

          return (
            <div key={integration.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {data && <StatusIcon status={data.status} />}
                  <span className="font-medium text-sm truncate">
                    {config.label || config.url}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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

              <p className="text-xs text-muted-foreground truncate">{config.url}</p>

              {data ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant={statusVariant[data.status]}>
                      {data.status === "up" ? th("up") : data.status === "degraded" ? th("degraded") : th("down")}
                    </Badge>
                    {data.statusCode && (
                      <span className="text-xs text-muted-foreground">HTTP {data.statusCode}</span>
                    )}
                    {data.responseTimeMs !== null && (
                      <span className="text-xs text-muted-foreground">{data.responseTimeMs}ms</span>
                    )}
                    {data.error && (
                      <span className="text-xs text-destructive truncate max-w-48">{data.error}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(data.checkedAt).toLocaleString()}
                    </span>
                  </div>
                  {uptimeHistoryByIntegration[integration.id]?.length > 0 && (
                    <UptimeDots history={uptimeHistoryByIntegration[integration.id]} />
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {ts("lastSynced")}: {ts("never")} —{" "}
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
