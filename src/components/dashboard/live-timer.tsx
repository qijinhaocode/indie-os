"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Play, Square, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/db/schema";

const STORAGE_KEY = "indie-os-timer";

interface TimerState {
  startedAt: number;
  projectId: string;
}

interface LiveTimerProps {
  projects: Project[];
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveTimer({ projects }: LiveTimerProps) {
  const t = useTranslations("timer");
  const tf = useTranslations("time.form");
  const router = useRouter();

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [logDesc, setLogDesc] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as TimerState;
      const secs = Math.floor((Date.now() - state.startedAt) / 1000);
      if (secs > 0 && secs < 24 * 3600) {
        setElapsed(secs);
        setSelectedProjectId(state.projectId);
        setRunning(true);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw) as TimerState;
        setElapsed(Math.floor((Date.now() - state.startedAt) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function handleStart() {
    if (!selectedProjectId) return;
    const state: TimerState = { startedAt: Date.now(), projectId: selectedProjectId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setElapsed(0);
    setRunning(true);
  }

  function handleStop() {
    setRunning(false);
    setShowLog(true);
    setLogDate(new Date().toISOString().split("T")[0]);
  }

  const handleDiscard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRunning(false);
    setShowLog(false);
    setElapsed(0);
    setSelectedProjectId("");
  }, []);

  async function handleSave() {
    setSaving(true);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    try {
      await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          hours: Math.floor(minutes / 60),
          minutes: minutes % 60,
          description: logDesc || undefined,
          loggedAt: logDate,
        }),
      });
      localStorage.removeItem(STORAGE_KEY);
      setShowLog(false);
      setElapsed(0);
      setSelectedProjectId("");
      setLogDesc("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (showLog) {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const projectName = projects.find((p) => String(p.id) === selectedProjectId)?.name ?? "";

    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t("saveSession")}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {t("duration")}: {formatElapsed(elapsed)} · {projectName}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tf("hours")}</Label>
              <Input readOnly value={h} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tf("minutes")}</Label>
              <Input readOnly value={m} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tf("date")}</Label>
              <Input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{tf("description")}</Label>
            <Textarea
              placeholder={tf("descriptionPlaceholder")}
              value={logDesc}
              onChange={(e) => setLogDesc(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDiscard} className="text-muted-foreground">
              {t("discard")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={running ? "border-emerald-400 dark:border-emerald-600" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Timer className={`h-5 w-5 shrink-0 ${running ? "text-emerald-500" : "text-muted-foreground"}`} />

          {running ? (
            <>
              <span className="font-mono text-2xl font-bold tracking-widest tabular-nums">
                {formatElapsed(elapsed)}
              </span>
              <span className="text-sm text-muted-foreground">
                {projects.find((p) => String(p.id) === selectedProjectId)?.name}
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
                className="ml-auto"
              >
                <Square className="h-3.5 w-3.5 mr-1.5 fill-current" />
                {t("stop")}
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-muted-foreground">{t("title")}</span>
              <div className="flex items-center gap-2 ml-auto">
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-8 text-sm w-36"
                >
                  <option value="">{tf("selectProject")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  onClick={handleStart}
                  disabled={!selectedProjectId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  {t("start")}
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
