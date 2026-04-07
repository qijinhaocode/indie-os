"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Project } from "@/db/schema";

interface LogTimeDialogProps {
  children: React.ReactNode;
  projects: Project[];
}

export function LogTimeDialog({ children, projects }: LogTimeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("time.form");

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      projectId: formData.get("projectId"),
      hours: formData.get("hours"),
      minutes: formData.get("minutes"),
      description: formData.get("description"),
      loggedAt: formData.get("loggedAt"),
    };
    try {
      const res = await fetch("/api/time-logs", {
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
                <Label htmlFor="t-project">{t("project")} *</Label>
                <Select id="t-project" name="projectId" required>
                  <option value="">{t("selectProject")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-hours">{t("hours")}</Label>
                  <Input id="t-hours" name="hours" type="number" min="0" max="23" placeholder="0" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-minutes">{t("minutes")}</Label>
                  <Input id="t-minutes" name="minutes" type="number" min="0" max="59" placeholder="30" defaultValue="0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-desc">{t("description")}</Label>
                <Textarea id="t-desc" name="description" placeholder={t("descriptionPlaceholder")} rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-date">{t("date")} *</Label>
                <Input id="t-date" name="loggedAt" type="date" required defaultValue={today} />
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
