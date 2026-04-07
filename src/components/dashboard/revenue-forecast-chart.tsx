"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MonthlyPoint {
  month: string;
  mrr: number;
}

interface ForecastPoint {
  month: string;
  mrr: number;
  type: string;
}

interface ForecastResponse {
  actual: MonthlyPoint[];
  forecast: ForecastPoint[];
  optimistic: ForecastPoint[];
  pessimistic: ForecastPoint[];
  avgGrowth: number;
  currentMrr: number;
  projectedMrr12m: number;
}

interface ChartRow {
  month: string;
  actual?: number;
  forecast?: number;
  optimistic?: number;
  pessimistic?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: entry.color ?? entry.stroke }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{formatCurrency(entry.value as number)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueForecastChart() {
  const t = useTranslations("forecast");
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/revenue-forecast")
      .then((r) => r.json())
      .then((d) => setData(d as ForecastResponse))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.actual.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("notEnoughData")}
        </CardContent>
      </Card>
    );
  }

  // Build unified chart rows
  const map = new Map<string, ChartRow>();
  data.actual.forEach((p) => {
    map.set(p.month, { month: p.month, actual: p.mrr });
  });
  // bridge: last actual point also shown as first forecast point
  const lastActual = data.actual[data.actual.length - 1];
  if (lastActual) {
    const row = map.get(lastActual.month) ?? { month: lastActual.month };
    row.forecast = lastActual.mrr;
    row.optimistic = lastActual.mrr;
    row.pessimistic = lastActual.mrr;
    map.set(lastActual.month, row);
  }
  data.forecast.forEach((p) => {
    const row = map.get(p.month) ?? { month: p.month };
    row.forecast = p.mrr;
    map.set(p.month, row);
  });
  data.optimistic.forEach((p) => {
    const row = map.get(p.month) ?? { month: p.month };
    row.optimistic = p.mrr;
    map.set(p.month, row);
  });
  data.pessimistic.forEach((p) => {
    const row = map.get(p.month) ?? { month: p.month };
    row.pessimistic = p.mrr;
    map.set(p.month, row);
  });

  const chartData = Array.from(map.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const growthPct = (data.avgGrowth * 100).toFixed(1);
  const isPositive = data.avgGrowth > 0.005;
  const isNegative = data.avgGrowth < -0.005;

  const splitMonth = lastActual?.month ?? "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("title")}
          </CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : isNegative ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : isNegative
                    ? "text-red-600 dark:text-red-400 font-semibold"
                    : "text-muted-foreground"
                }
              >
                {isPositive ? "+" : ""}{growthPct}% {t("momGrowth")}
              </span>
            </div>
            <div className="text-muted-foreground">
              {t("projected12m")}:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(data.projectedMrr12m)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              className="fill-muted-foreground"
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: "12px" }}
            />

            {splitMonth && (
              <ReferenceLine
                x={splitMonth}
                stroke="var(--border)"
                strokeDasharray="4 4"
                label={{ value: t("today"), position: "top", fontSize: 11 }}
              />
            )}

            {/* Actual */}
            <Line
              dataKey="actual"
              name={t("actual")}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls
            />

            {/* Optimistic / pessimistic range */}
            <Area
              dataKey="optimistic"
              name={t("optimistic")}
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="#10b98115"
              dot={false}
              connectNulls
            />
            <Area
              dataKey="pessimistic"
              name={t("pessimistic")}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="#f59e0b10"
              dot={false}
              connectNulls
            />

            {/* Central forecast */}
            <Line
              dataKey="forecast"
              name={t("forecast")}
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">{t("disclaimer")}</p>
      </CardContent>
    </Card>
  );
}
