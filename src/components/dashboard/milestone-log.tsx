"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Flag, Plus, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Milestone } from "@/db/schema";

interface MilestoneLogProps {
  projectId: number;
  milestones: Milestone[];
}

const QUICK_ICONS = ["🎯", "🚀", "💰", "🏆", "⭐", "🎉", "📢", "🔥", "💡", "🛡️"];

export function MilestoneLog({ projectId, milestones }: MilestoneLogProps) {
  const t = useTranslations("milestones");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description: description || undefined,
          icon,
          occurredAt,
        }),
      });
      setTitle("");
      setDescription("");
      setIcon("🎯");
      setOccurredAt(new Date().toISOString().split("T")[0]);
      setShowForm(false);
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Flag className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("form.icon")}</Label>
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_ICONS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setIcon(em)}
                    className={`text-lg rounded p-0.5 transition-colors ${
                      icon === em
                        ? "ring-2 ring-primary bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("form.title")} *</Label>
              <Input
                placeholder={t("form.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("form.description")}</Label>
                <Input
                  placeholder={t("form.descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("form.date")}</Label>
                <Input
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={adding || !title.trim()}
              >
                {adding ? t("form.adding") : t("form.add")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setTitle("");
                  setDescription("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {milestones.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-6">{t("empty")}</p>
        )}

        {milestones.length > 0 && (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {milestones.map((m, i) => (
                <div key={m.id} className="relative flex gap-4 pb-5 last:pb-0">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border border-border text-lg">
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{m.title}</p>
                        {m.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {m.occurredAt}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(m.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {i < milestones.length - 1 && <div />}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
