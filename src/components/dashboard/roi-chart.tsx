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

interface RoiChartProps {
  data: { project: string; roi: number }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(271, 81%, 56%)",
  "hsl(349, 89%, 60%)",
];

export function RoiChart({ data }: RoiChartProps) {
  const t = useTranslations("overview");
  if (data.length < 2) return null;

  const sorted = [...data].sort((a, b) => b.roi - a.roi);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {t("charts.roiTitle")}
      </p>
      <ResponsiveContainer width="100%" height={Math.max(120, sorted.length * 36)}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}/h`}
          />
          <YAxis
            type="category"
            dataKey="project"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
                  <p className="font-semibold">
                    ${(payload[0].value as number).toFixed(2)}/h
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
            {sorted.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
