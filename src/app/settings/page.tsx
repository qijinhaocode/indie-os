import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  const rows = await db.select().from(appSettings);
  const saved: Record<string, boolean> = {};
  for (const r of rows) {
    saved[r.key] = !!r.value;
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3">
        <p className="text-xs text-amber-700 dark:text-amber-400">{t("danger")}</p>
      </div>

      <SettingsForm savedKeys={saved} />
    </div>
  );
}
