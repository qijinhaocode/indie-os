import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function TimePage() {
  const t = await getTranslations("time");
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">{t("comingSoon")}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t("comingSoonDesc")}</p>
      </div>
    </div>
  );
}
