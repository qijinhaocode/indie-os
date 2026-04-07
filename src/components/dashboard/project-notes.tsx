"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Save, NotebookPen, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProjectNotesProps {
  projectId: number;
  initialContent: string;
}

export function ProjectNotes({ projectId, initialContent }: ProjectNotesProps) {
  const t = useTranslations("notes");
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (text: string) => {
      setSaving(true);
      try {
        await fetch(`/api/projects/${projectId}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    },
    [projectId]
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setContent(text);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      void save(text);
    }, 1200);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <NotebookPen className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              {t("saved")}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void save(content)}
            disabled={saving}
            className="h-7 px-2.5 text-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <textarea
          value={content}
          onChange={handleChange}
          placeholder={t("placeholder")}
          className="w-full min-h-[200px] resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono leading-relaxed"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground mt-1.5">{t("autosave")}</p>
      </CardContent>
    </Card>
  );
}
