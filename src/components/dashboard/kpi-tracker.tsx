"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart2,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { KpiMetric, KpiValue } from "@/db/schema";

interface KpiTrackerProps {
  projectId: number;
  metrics: Array<KpiMetric & { values: KpiValue[] }>;
}

const PRESET_ICONS = ["📈", "👥", "⭐", "💬", "🔄", "📧", "🎯", "💰"];

function KpiChart({
  values,
  unit,
}: {
  values: KpiValue[];
  unit: string;
}) {
  const sorted = [...values].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  );
  const data = sorted.map((v) => ({
    date: v.recordedAt.slice(5), // MM-DD
    value: v.value,
  }));

  if (data.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}${unit ? ` ${unit}` : ""}`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-border bg-card px-2 py-1.5 shadow-md text-xs">
                <p className="text-muted-foreground">{label}</p>
                <p className="font-semibold">
                  {payload[0].value}
                  {unit ? ` ${unit}` : ""}
                </p>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--primary))" }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MetricCard({
  metric,
  onDelete,
  onAddValue,
}: {
  metric: KpiMetric & { values: KpiValue[] };
  onDelete: (id: number) => void;
  onAddValue: (metricId: number, value: number, date: string, note: string) => Promise<void>;
}) {
  const t = useTranslations("kpi");
  const [expanded, setExpanded] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logValue, setLogValue] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logNote, setLogNote] = useState("");
  const [logging, setLogging] = useState(false);

  const latest = metric.values[0];
  const prev = metric.values[1];
  const delta =
    latest && prev ? latest.value - prev.value : null;

  async function handleLog() {
    if (!logValue) return;
    setLogging(true);
    try {
      await onAddValue(metric.id, parseFloat(logValue), logDate, logNote);
      setLogValue("");
      setLogNote("");
      setShowLogForm(false);
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">{metric.name}</p>
          {metric.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{metric.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(metric.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Latest value + delta */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-2xl font-bold">
            {latest ? latest.value : "—"}
            {metric.unit && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {metric.unit}
              </span>
            )}
          </p>
          {latest && (
            <p className="text-xs text-muted-foreground mt-0.5">{latest.recordedAt}</p>
          )}
        </div>
        {delta !== null && (
          <p
            className={`text-sm font-medium mb-1 ${
              delta > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : delta < 0
                ? "text-red-500"
                : "text-muted-foreground"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}
            {metric.unit ? ` ${metric.unit}` : ""}
          </p>
        )}
      </div>

      {/* Trend chart */}
      {expanded && metric.values.length >= 2 && (
        <KpiChart values={metric.values} unit={metric.unit} />
      )}

      {/* Value history */}
      {expanded && metric.values.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {metric.values.slice(0, 10).map((v) => (
            <div
              key={v.id}
              className="flex justify-between text-xs py-1 border-b border-border last:border-0"
            >
              <span className="text-muted-foreground">{v.recordedAt}</span>
              <span className="font-medium">
                {v.value}
                {metric.unit ? ` ${metric.unit}` : ""}
              </span>
              {v.note && (
                <span className="text-muted-foreground truncate max-w-24 ml-2">{v.note}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Log new value */}
      {showLogForm ? (
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("logForm.value")}</Label>
              <Input
                type="number"
                step="any"
                value={logValue}
                onChange={(e) => setLogValue(e.target.value)}
                className="h-7 text-sm mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">{t("logForm.date")}</Label>
              <Input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="h-7 text-sm mt-1"
              />
            </div>
          </div>
          <Input
            placeholder={t("logForm.notePlaceholder")}
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            className="h-7 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleLog}
              disabled={logging || !logValue}
            >
              {logging ? t("logForm.logging") : t("logForm.log")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowLogForm(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setShowLogForm(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          {t("logValue")}
        </Button>
      )}
    </div>
  );
}

export function KpiTracker({ projectId, metrics: initialMetrics }: KpiTrackerProps) {
  const t = useTranslations("kpi");
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAddMetric() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: name.trim(), unit, description }),
      });
      setName("");
      setUnit("");
      setDescription("");
      setShowAddForm(false);
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteMetric(id: number) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/kpi/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleAddValue(
    metricId: number,
    value: number,
    recordedAt: string,
    note: string
  ) {
    await fetch(`/api/kpi/${metricId}/values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, recordedAt, note: note || undefined }),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        {!showAddForm && (
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("addMetric")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("form.name")} *</Label>
                <Input
                  placeholder={t("form.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("form.unit")}</Label>
                <Input
                  placeholder={t("form.unitPlaceholder")}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("form.description")}</Label>
              <Input
                placeholder={t("form.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("form.examples")}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddMetric}
                disabled={adding || !name.trim()}
              >
                {adding ? t("form.adding") : t("form.add")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setName("");
                  setUnit("");
                  setDescription("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {initialMetrics.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground text-center py-6">{t("empty")}</p>
        )}

        <div className="space-y-3">
          {initialMetrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              onDelete={handleDeleteMetric}
              onAddValue={handleAddValue}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
