"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AddProjectDialogProps {
  children: React.ReactNode;
}

export function AddProjectDialog({ children }: AddProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("projects.form");
  const ts = useTranslations("projects.status");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      status: formData.get("status"),
      repo: formData.get("repo"),
      domain: formData.get("domain"),
      techStack: formData.get("techStack"),
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setOpen(false);
        formRef.current?.reset();
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
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("name")} *</Label>
                <Input id="name" name="name" required placeholder={t("namePlaceholder")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">{t("description")}</Label>
                <Textarea id="description" name="description" placeholder={t("descriptionPlaceholder")} rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="status">{t("status")}</Label>
                  <Select id="status" name="status" defaultValue="active">
                    <option value="idea">{ts("idea")}</option>
                    <option value="active">{ts("active")}</option>
                    <option value="paused">{ts("paused")}</option>
                    <option value="archived">{ts("archived")}</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="techStack">{t("techStack")}</Label>
                  <Input id="techStack" name="techStack" placeholder={t("techStackPlaceholder")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="repo">{t("repo")}</Label>
                <Input id="repo" name="repo" placeholder={t("repoPlaceholder")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="domain">{t("domain")}</Label>
                <Input id="domain" name="domain" placeholder={t("domainPlaceholder")} />
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
