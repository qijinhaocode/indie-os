"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, Trophy, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Insight {
  type: "opportunity" | "risk" | "achievement" | "tip";
  title: string;
  body: string;
}

interface InsightResponse {
  insights: Insight[];
  generatedAt: string;
  dataSnapshot: {
    projects: number;
    mrr30: number;
    hours30: number;
  };
  error?: string;
}

const insightConfig: Record<
  Insight["type"],
  { icon: React.ElementType; variant: "success" | "warning" | "danger" | "outline"; label: string }
> = {
  opportunity: { icon: TrendingUp, variant: "success", label: "机会" },
  risk: { icon: AlertTriangle, variant: "warning", label: "风险" },
  achievement: { icon: Trophy, variant: "outline", label: "成就" },
  tip: { icon: Lightbulb, variant: "outline", label: "建议" },
};

export function AiCopilot({ hasOpenAiKey }: { hasOpenAiKey: boolean }) {
  const t = useTranslations("ai");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  async function generateInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      const json = await res.json() as InsightResponse;
      if (!res.ok) {
        setError(json.error ?? "Failed to generate insights");
      } else {
        setData(json);
        setCollapsed(false);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("title")}
        </CardTitle>
        <div className="flex items-center gap-1.5">
          {data && (
            <Button variant="ghost" size="sm" className="h-7 px-2"
              onClick={() => setCollapsed((c) => !c)}>
              {collapsed
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronUp className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 px-3"
            onClick={generateInsights}
            disabled={loading || !hasOpenAiKey}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? t("generating") : data ? t("refresh") : t("generate")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasOpenAiKey && (
          <p className="text-sm text-muted-foreground">
            {t("noKey")}{" "}
            <a href="/settings" className="text-primary hover:underline">{t("goToSettings")}</a>
          </p>
        )}

        {hasOpenAiKey && !data && !error && !loading && (
          <p className="text-sm text-muted-foreground">{t("prompt")}</p>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            {t("analyzing")}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {data && !collapsed && (
          <div className="space-y-3">
            {data.dataSnapshot && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground border-b border-border pb-3">
                <span>{t("snapshotProjects", { count: data.dataSnapshot.projects })}</span>
                <span>MRR ${data.dataSnapshot.mrr30.toFixed(0)}</span>
                <span>{data.dataSnapshot.hours30}h {t("thisMonth")}</span>
                <span className="ml-auto">{new Date(data.generatedAt).toLocaleString()}</span>
              </div>
            )}

            {data.insights.map((insight, i) => {
              const cfg = insightConfig[insight.type] ?? insightConfig.tip;
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="shrink-0 mt-0.5">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
