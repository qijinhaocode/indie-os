import { db } from "@/db";
import { revenueEntries, projects } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Download } from "lucide-react";
import { LogRevenueDialog } from "./log-revenue-dialog";
import { DeleteEntryButton } from "./delete-entry-button";
import Link from "next/link";

const typeVariant = {
  mrr: "success" as const,
  one_time: "secondary" as const,
  refund: "danger" as const,
};

export default async function RevenuePage() {
  const t = await getTranslations("revenue");

  const allProjects = await db.select().from(projects).orderBy(projects.name);

  const entries = await db
    .select({
      id: revenueEntries.id,
      projectId: revenueEntries.projectId,
      projectName: projects.name,
      amount: revenueEntries.amount,
      currency: revenueEntries.currency,
      type: revenueEntries.type,
      source: revenueEntries.source,
      recordedAt: revenueEntries.recordedAt,
    })
    .from(revenueEntries)
    .leftJoin(projects, eq(revenueEntries.projectId, projects.id))
    .orderBy(desc(revenueEntries.recordedAt));

  const mrrResult = await db
    .select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
    .from(revenueEntries)
    .where(eq(revenueEntries.type, "mrr"));
  const totalMRR = mrrResult[0]?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <Link
              href="/api/export?type=revenue&format=csv"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("exportCsv")}</span>
            </Link>
          )}
          <LogRevenueDialog projects={allProjects}>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("addEntry")}</span>
              <span className="sm:hidden">{t("add")}</span>
            </button>
          </LogRevenueDialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalMRR")}</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(totalMRR)}</div>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t("noEntries")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("noEntriesDesc")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("form.project")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("form.amount")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("form.type")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">{t("form.source")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("form.date")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{entry.projectName}</td>
                  <td className="px-4 py-3 font-mono">
                    <span className={entry.type === "refund" ? "text-destructive" : ""}>
                      {entry.type === "refund" ? "-" : ""}{formatCurrency(entry.amount, entry.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={typeVariant[entry.type]}>{t(`type.${entry.type}`)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{entry.source ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.recordedAt}</td>
                  <td className="px-4 py-3">
                    <DeleteEntryButton id={entry.id} endpoint="revenue" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
