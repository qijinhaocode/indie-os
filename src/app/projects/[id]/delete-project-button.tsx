"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ projectId, projectName }: { projectId: number; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("projects");

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/projects");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        {t("deleteProject")}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{t("deleteConfirm")}</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{projectName}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-6">{t("deleteConfirmDesc")}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button variant="destructive" className="flex-1" disabled={loading} onClick={handleDelete}>
                {loading ? "..." : t("confirmDelete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
