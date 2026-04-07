"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#14b8a6",
];

interface Project {
  id: number;
  name: string;
  status: string;
}

interface MonthlyTimeRow {
  month: string;
  projectId: number | null;
  minutes: number;
}

interface MonthlyRevenueRow {
  month: string;
  projectId: number | null;
  amount: number;
  type: string;
}

interface WeeklyTimeRow {
  week: string;
  projectId: number | null;
  minutes: number;
}

interface ProjectTotal {
  projectId: number | null;
  totalMinutes: number;
}

interface ProjectRevenueTotal {
  projectId: number | null;
  totalRevenue: number;
}

interface Props {
  projects: Project[];
  monthlyTime: MonthlyTimeRow[];
  monthlyRevenue: MonthlyRevenueRow[];
  weeklyTime: WeeklyTimeRow[];
  projectTotals: ProjectTotal[];
  projectRevenueTotals: ProjectRevenueTotal[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TimeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, e: { value: number }) => s + (e.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow text-xs space-y-1">
      <p className="font-medium">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((e: any) => (
        <div key={e.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: e.fill }} />
          <span className="text-muted-foreground">{e.name}:</span>
          <span className="font-semibold">{Math.round(e.value as number)}h</span>
        </div>
      ))}
      <div className="border-t pt-1 font-semibold">
        Total: {Math.round(total)}h
      </div>
    </div>
  );
}

export function ReportsClient({
  projects,
  monthlyTime,
  monthlyRevenue,
  weeklyTime,
  projectTotals,
  projectRevenueTotals,
}: Props) {
  const t = useTranslations("reports");
  const [view, setView] = useState<"monthly" | "weekly">("monthly");

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const projectColor = Object.fromEntries(
    projects.map((p, i) => [p.id, COLORS[i % COLORS.length]])
  );

  // ─── Monthly time chart ───────────────────────────────────────────────────
  const allMonths = [...new Set(monthlyTime.map((r) => r.month))].sort();
  const monthlyTimeData = allMonths.map((month) => {
    const row: Record<string, string | number> = { month: month.slice(5) };
    monthlyTime
      .filter((r) => r.month === month)
      .forEach((r) => {
        const name = r.projectId ? (projectMap[r.projectId] ?? `#${r.projectId}`) : "Other";
        row[name] = (Number(row[name] ?? 0) + r.minutes / 60);
      });
    return row;
  });

  // ─── Weekly time chart ────────────────────────────────────────────────────
  const allWeeks = [...new Set(weeklyTime.map((r) => r.week))].sort();
  const weeklyTimeData = allWeeks.map((week) => {
    const row: Record<string, string | number> = { week: week.slice(5) };
    weeklyTime
      .filter((r) => r.week === week)
      .forEach((r) => {
        const name = r.projectId ? (projectMap[r.projectId] ?? `#${r.projectId}`) : "Other";
        row[name] = (Number(row[name] ?? 0) + r.minutes / 60);
      });
    return row;
  });

  // Active projects with data
  const activeProjects = projects.filter((p) =>
    projectTotals.some((t) => t.projectId === p.id && t.totalMinutes > 0)
  );

  // ─── Pie: time allocation ─────────────────────────────────────────────────
  const timePieData = projectTotals
    .filter((r) => r.projectId !== null && r.totalMinutes > 0)
    .map((r) => ({
      name: r.projectId ? (projectMap[r.projectId] ?? `#${r.projectId}`) : "Other",
      value: Math.round(r.totalMinutes / 60),
      color: r.projectId ? projectColor[r.projectId] : "#888",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // ─── Monthly revenue line ─────────────────────────────────────────────────
  const allRevMonths = [...new Set(monthlyRevenue.map((r) => r.month))].sort();
  const monthlyRevenueData = allRevMonths.map((month) => {
    const row: Record<string, string | number> = { month: month.slice(5) };
    monthlyRevenue
      .filter((r) => r.month === month)
      .forEach((r) => {
        row["Revenue"] = (Number(row["Revenue"] ?? 0) + r.amount);
      });
    return row;
  });

  // ─── Project comparison table ─────────────────────────────────────────────
  const projectComparison = projects
    .map((p) => {
      const time = projectTotals.find((t) => t.projectId === p.id)?.totalMinutes ?? 0;
      const rev = projectRevenueTotals.find((r) => r.projectId === p.id)?.totalRevenue ?? 0;
      const roi = time > 60 ? rev / (time / 60) : null;
      return { ...p, time, rev, roi };
    })
    .filter((p) => p.time > 0 || p.rev > 0)
    .sort((a, b) => b.time - a.time);

  const timeChartData = view === "monthly" ? monthlyTimeData : weeklyTimeData;
  const timeChartKey = view === "monthly" ? "month" : "week";

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" />
              {t("totalHours")}
            </div>
            <p className="text-2xl font-bold">
              {Math.round(
                projectTotals.reduce((s, r) => s + r.totalMinutes, 0) / 60
              )}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" />
              {t("activeProjects")}
            </div>
            <p className="text-2xl font-bold">{activeProjects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              {t("totalRevenue")}
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(
                projectRevenueTotals.reduce((s, r) => s + r.totalRevenue, 0)
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("avgRoi")}
            </div>
            <p className="text-2xl font-bold">
              {(() => {
                const totalH = projectTotals.reduce((s, r) => s + r.totalMinutes, 0) / 60;
                const totalR = projectRevenueTotals.reduce((s, r) => s + r.totalRevenue, 0);
                return totalH > 0 ? formatCurrency(totalR / totalH) + "/h" : "—";
              })()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time chart + toggle */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("timeAllocation")}
          </CardTitle>
          <div className="flex gap-1">
            {(["monthly", "weekly"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`view.${v}`)}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {timeChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey={timeChartKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}h`} width={36} />
                <Tooltip content={<TimeTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
                {activeProjects.map((p) => (
                  <Bar
                    key={p.id}
                    dataKey={p.name}
                    stackId="time"
                    fill={projectColor[p.id]}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Time Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("timeByProject")}</CardTitle>
          </CardHeader>
          <CardContent>
            {timePieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("noData")}</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={timePieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} strokeWidth={1}>
                      {timePieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}h`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {timePieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
                        <span className="truncate">{entry.name}</span>
                      </div>
                      <span className="font-semibold shrink-0">{entry.value}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue line */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t("revenueOverTime")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenueData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("noData")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyRevenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={44} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line dataKey="Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project comparison table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("projectComparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          {projectComparison.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">{t("table.project")}</th>
                    <th className="pb-2 pr-4 font-medium">{t("table.status")}</th>
                    <th className="pb-2 pr-4 font-medium text-right">{t("table.hours")}</th>
                    <th className="pb-2 pr-4 font-medium text-right">{t("table.mrr")}</th>
                    <th className="pb-2 font-medium text-right">{t("table.roi")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectComparison.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-4 font-medium">{p.name}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          p.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {Math.round(p.time / 60)}h
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {p.rev > 0 ? formatCurrency(p.rev) : "—"}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {p.roi !== null && p.roi > 0
                          ? <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(p.roi)}/h</span>
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
