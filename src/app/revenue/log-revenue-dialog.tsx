"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Project } from "@/db/schema";

interface LogRevenueDialogProps {
  children: React.ReactNode;
  projects: Project[];
}

export function LogRevenueDialog({ children, projects }: LogRevenueDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("revenue.form");
  const tt = useTranslations("revenue.type");

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      projectId: formData.get("projectId"),
      amount: formData.get("amount"),
      currency: formData.get("currency"),
      type: formData.get("type"),
      source: formData.get("source"),
      recordedAt: formData.get("recordedAt"),
    };
    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t("title")}</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="r-project">{t("project")} *</Label>
                <Select id="r-project" name="projectId" required>
                  <option value="">{t("selectProject")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-amount">{t("amount")} *</Label>
                  <Input id="r-amount" name="amount" type="number" min="0" step="0.01" required placeholder="99" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-currency">{t("currency")}</Label>
                  <Select id="r-currency" name="currency" defaultValue="USD">
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-type">{t("type")}</Label>
                <Select id="r-type" name="type" defaultValue="mrr">
                  <option value="mrr">{tt("mrr")}</option>
                  <option value="one_time">{tt("one_time")}</option>
                  <option value="refund">{tt("refund")}</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-source">{t("source")}</Label>
                <Input id="r-source" name="source" placeholder={t("sourcePlaceholder")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-date">{t("date")} *</Label>
                <Input id="r-date" name="recordedAt" type="date" required defaultValue={today} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? t("submitting") : t("submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
