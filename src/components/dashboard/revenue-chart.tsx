"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTranslations } from "next-intl";

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold">
        ${payload[0].value.toFixed(2)}
      </p>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  const t = useTranslations("overview");
  if (data.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{t("charts.revenueTitle")}</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
          <Bar
            dataKey="revenue"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
