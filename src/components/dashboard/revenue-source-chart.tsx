"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTranslations } from "next-intl";

interface RevenueSourceChartProps {
  data: { source: string; amount: number }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(271, 81%, 56%)",
  "hsl(349, 89%, 60%)",
];

const SOURCE_LABELS: Record<string, string> = {
  "stripe-auto": "Stripe MRR",
  "revenuecat-auto": "RevenueCat MRR",
  manual: "Manual",
  mrr: "MRR",
  one_time: "One-time",
  refund: "Refund",
};

function labelFor(source: string) {
  return SOURCE_LABELS[source] ?? source;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { pct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{p.name}</p>
      <p className="text-muted-foreground">
        ${p.value.toFixed(2)} ({p.payload.pct}%)
      </p>
    </div>
  );
}

export function RevenueSourceChart({ data }: RevenueSourceChartProps) {
  const t = useTranslations("overview");

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.amount, 0);
  const chartData = data.map((d) => ({
    name: labelFor(d.source),
    value: parseFloat(d.amount.toFixed(2)),
    pct: total > 0 ? Math.round((d.amount / total) * 100) : 0,
  }));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {t("charts.revenueSourceTitle")}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                strokeWidth={0}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
