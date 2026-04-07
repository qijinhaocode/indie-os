"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Smartphone, Star, RefreshCw, Trash2, Plus, X, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Integration } from "@/db/schema";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AppStoreData {
  appId: string;
  name: string;
  icon: string;
  rating: number;
  ratingCount: number;
  price: number;
  currency: string;
  genre: string;
  version: string;
  releaseNotes?: string;
  sellerName: string;
  storeUrl: string;
  syncedAt: string;
}

interface AppStoreIntegrationProps {
  projectId: number;
  integrations: Integration[];
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < full
              ? "fill-amber-400 text-amber-400"
              : i === full && half
              ? "fill-amber-200 text-amber-400"
              : "text-muted-foreground"
          )}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function AppStoreIntegration({
  projectId,
  integrations,
}: AppStoreIntegrationProps) {
  const ti = useTranslations("integrations");
  const ta = useTranslations("appstore");
  const ts = useTranslations("services");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [appId, setAppId] = useState("");
  const [country, setCountry] = useState("us");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const appStoreIntegrations = integrations.filter((i) => i.type === "appstore");

  async function handleAdd() {
    if (!appId.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type: "appstore",
          config: { appId: appId.trim(), country: country.trim() || "us" },
        }),
      });
      setShowForm(false);
      setAppId("");
      setCountry("us");
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
          <Smartphone className="h-4 w-4" />
          App Store Connect
        </CardTitle>
        {appStoreIntegrations.length === 0 && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {ti("add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">{ta("addDesc")}</p>
            <div className="space-y-2">
              <Label className="text-xs">{ta("appIdLabel")} *</Label>
              <Input
                placeholder="1234567890"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="h-8 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">{ta("appIdHint")}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{ta("countryLabel")}</Label>
              <Input
                placeholder="us"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-8 text-sm w-24"
                maxLength={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={adding || !appId.trim()}>
                {adding ? ti("submitting") : ti("submit")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setAppId("");
                  setCountry("us");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {appStoreIntegrations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {ts("noIntegrations")}
          </p>
        )}

        {appStoreIntegrations.map((integration) => {
          const data = integration.cachedData
            ? (JSON.parse(integration.cachedData) as AppStoreData)
            : null;
          const isSyncing = syncingId === integration.id;
          const config = JSON.parse(integration.config) as { appId: string; country?: string };

          return (
            <div key={integration.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">
                  {data?.name ?? `App #${config.appId}`}
                </span>
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
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    {data.icon && (
                      <Image
                        src={data.icon}
                        alt={data.name}
                        width={56}
                        height={56}
                        className="rounded-xl shrink-0 border border-border"
                        unoptimized
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{data.name}</p>
                      <p className="text-xs text-muted-foreground">{data.genre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        v{data.version} · {data.sellerName}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{ta("rating")}</p>
                      <div className="mt-1">
                        <Stars rating={data.rating} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtCount(data.ratingCount)} {ta("ratings")}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{ta("price")}</p>
                      <p className="text-xl font-bold mt-1">
                        {data.price === 0
                          ? ta("free")
                          : `${data.price} ${data.currency}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {ts("lastSynced")}: {new Date(data.syncedAt).toLocaleString()}
                    </p>
                    <a
                      href={data.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {ta("viewInStore")}
                    </a>
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
