"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Project } from "@/db/schema";

export function EditProjectForm({ project }: { project: Project }) {
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
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
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
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" />
        {t("submitEdit")}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t("editTitle")}</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">{t("name")} *</Label>
                <Input id="edit-name" name="name" required defaultValue={project.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">{t("description")}</Label>
                <Textarea id="edit-desc" name="description" rows={2} defaultValue={project.description ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-status">{t("status")}</Label>
                  <Select id="edit-status" name="status" defaultValue={project.status}>
                    <option value="idea">{ts("idea")}</option>
                    <option value="active">{ts("active")}</option>
                    <option value="paused">{ts("paused")}</option>
                    <option value="archived">{ts("archived")}</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-stack">{t("techStack")}</Label>
                  <Input id="edit-stack" name="techStack" placeholder={t("techStackPlaceholder")} defaultValue={project.techStack ?? ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-repo">{t("repo")}</Label>
                <Input id="edit-repo" name="repo" placeholder={t("repoPlaceholder")} defaultValue={project.repo ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-domain">{t("domain")}</Label>
                <Input id="edit-domain" name="domain" placeholder={t("domainPlaceholder")} defaultValue={project.domain ?? ""} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? t("saving") : t("submitEdit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
