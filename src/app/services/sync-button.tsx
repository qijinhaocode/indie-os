"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncButton({ integrationId }: { integrationId: number }) {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const t = useTranslations("services");

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch(`/api/integrations/${integrationId}/sync`, { method: "POST" });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      title={syncing ? t("syncing") : t("sync")}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
    </button>
  );
}
