"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTranslations } from "next-intl";

interface TimeChartProps {
  data: { project: string; hours: number }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(262 60% 65%)",
  "hsl(262 40% 75%)",
  "hsl(262 30% 80%)",
  "hsl(262 20% 85%)",
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { project: string } }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground mb-1">{payload[0].payload.project}</p>
      <p className="font-semibold">{payload[0].value.toFixed(1)}h</p>
    </div>
  );
}

export function TimeChart({ data }: TimeChartProps) {
  const t = useTranslations("overview");
  if (data.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{t("charts.timeTitle")}</p>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 4, left: 4, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}h`}
          />
          <YAxis
            type="category"
            dataKey="project"
            width={80}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
          <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
