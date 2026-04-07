"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Target, X, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, cn } from "@/lib/utils";

interface GoalWithProgress {
  id: number;
  title: string;
  type: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  projectId: number | null;
  projectName: string | null;
  deadline: string | null;
  pct: number;
  createdAt: string | null;
}

interface GoalsClientProps {
  goals: GoalWithProgress[];
  projects: { id: number; name: string }[];
}

const GOAL_TYPES = ["mrr", "revenue_month", "time_month", "time_total"] as const;
type GoalType = (typeof GOAL_TYPES)[number];

const UNITS: Record<GoalType, string> = {
  mrr: "USD",
  revenue_month: "USD",
  time_month: "h",
  time_total: "h",
};

function formatValue(value: number, type: string, unit: string) {
  if (type === "mrr" || type === "revenue_month") {
    return formatCurrency(value, unit);
  }
  return `${value.toFixed(1)}h`;
}

export function GoalsClient({ goals, projects }: GoalsClientProps) {
  const t = useTranslations("goals");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>("mrr");
  const [targetValue, setTargetValue] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [deadline, setDeadline] = useState("");

  function resetForm() {
    setTitle("");
    setType("mrr");
    setTargetValue("");
    setProjectId("");
    setDeadline("");
    setShowForm(false);
  }

  async function handleAdd() {
    if (!title.trim() || !targetValue) return;
    setAdding(true);
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          targetValue: parseFloat(targetValue),
          unit: UNITS[type],
          projectId: projectId ? parseInt(projectId) : null,
          deadline: deadline || null,
        }),
      });
      resetForm();
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const completed = goals.filter((g) => g.pct >= 100);
  const active = goals.filter((g) => g.pct < 100);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("addGoal")}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t("newGoal")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("form.title")}</Label>
              <Input
                placeholder={t("form.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("form.type")}</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as GoalType)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {GOAL_TYPES.map((gt) => (
                    <option key={gt} value={gt}>
                      {t(`type.${gt}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t("form.target")} ({UNITS[type]})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="1000"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("form.project")}</Label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">{t("form.allProjects")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t("form.deadline")}</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={adding || !title.trim() || !targetValue}
              >
                {adding ? t("form.adding") : t("form.add")}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                {t("form.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowForm(true)}
            className="mt-1"
          >
            {t("addFirst")}
          </Button>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("inProgress")}
          </p>
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            {t("completed")}
          </p>
          {completed.map((g) => (
            <GoalCard key={g.id} goal={g} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onDelete,
}: {
  goal: GoalWithProgress;
  onDelete: (id: number) => void;
}) {
  const t = useTranslations("goals");
  const done = goal.pct >= 100;
  const daysLeft =
    goal.deadline
      ? Math.ceil(
          (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : null;

  return (
    <Card className={cn(done && "border-emerald-200 dark:border-emerald-900")}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{goal.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {t(`type.${goal.type}`)}
              </span>
              {goal.projectName && (
                <span className="text-xs text-muted-foreground">· {goal.projectName}</span>
              )}
              {daysLeft !== null && (
                <span
                  className={cn(
                    "text-xs",
                    daysLeft < 0
                      ? "text-destructive"
                      : daysLeft <= 7
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  )}
                >
                  ·{" "}
                  {daysLeft < 0
                    ? t("overdue", { days: Math.abs(daysLeft) })
                    : t("daysLeft", { days: daysLeft })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-sm font-bold",
                done ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}
            >
              {goal.pct}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(goal.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Progress value={goal.pct} className={cn("h-2", done && "[&>div]:bg-emerald-500")} />

        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {formatValue(goal.currentValue, goal.type, goal.unit)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatValue(goal.targetValue, goal.type, goal.unit)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
