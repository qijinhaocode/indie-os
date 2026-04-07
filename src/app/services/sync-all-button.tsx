"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SyncAllButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const t = useTranslations("services");

  async function handleSyncAll() {
    setSyncing(true);
    try {
      await fetch("/api/integrations/sync-all", { method: "POST" });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncing}>
      <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
      {syncing ? t("syncing") : t("sync") + " All"}
    </Button>
  );
}
