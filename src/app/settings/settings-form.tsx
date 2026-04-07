"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ExternalLink, Copy, RefreshCw } from "lucide-react";

interface SettingsFormProps {
  savedKeys: Record<string, boolean>;
}

export function SettingsForm({ savedKeys }: SettingsFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [githubToken, setGithubToken] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cronSecret, setCronSecret] = useState<string | null>(null);
  const [cronCopied, setCronCopied] = useState(false);
  const [cronLoading, setCronLoading] = useState(false);

  const loadCronSecret = useCallback(async () => {
    setCronLoading(true);
    try {
      const res = await fetch("/api/cron", { method: "POST" });
      const data = await res.json() as { secret: string };
      setCronSecret(data.secret);
    } finally {
      setCronLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCronSecret();
  }, [loadCronSecret]);

  const cronUrl = cronSecret
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/cron?secret=${cronSecret}`
    : "";

  async function handleCopyCronUrl() {
    if (!cronUrl) return;
    await navigator.clipboard.writeText(cronUrl);
    setCronCopied(true);
    setTimeout(() => setCronCopied(false), 2000);
  }

  async function handleSave() {
    setSaving(true);
    const body: Record<string, string> = {};
    if (githubToken) body["github_token"] = githubToken;
    if (vercelToken) body["vercel_token"] = vercelToken;
    if (stripeSecretKey) body["stripe_secret_key"] = stripeSecretKey;
    if (openaiApiKey) body["openai_api_key"] = openaiApiKey;

    if (Object.keys(body).length === 0) {
      setSaving(false);
      return;
    }

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    setSaved(true);
    setGithubToken("");
    setVercelToken("");
    setStripeSecretKey("");
    setOpenaiApiKey("");
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  const hasChanges = !!(githubToken || vercelToken || stripeSecretKey || openaiApiKey);

  return (
    <div className="space-y-4">
      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("apiKeys")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* GitHub Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="github-token" className="flex items-center gap-2">
                {t("githubToken")}
                {savedKeys["github_token"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
              </Label>
              <a href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=indie-os"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                {t("createToken")} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Input id="github-token" type="password" value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder={savedKeys["github_token"] ? "••••••••••••••••" : t("githubTokenPlaceholder")} />
            <p className="text-xs text-muted-foreground">{t("githubTokenDesc")}</p>
          </div>

          {/* Vercel Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vercel-token" className="flex items-center gap-2">
                {t("vercelToken")}
                {savedKeys["vercel_token"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
              </Label>
            </div>
            <Input id="vercel-token" type="password" value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
              placeholder={savedKeys["vercel_token"] ? "••••••••••••••••" : t("vercelTokenPlaceholder")} />
            <p className="text-xs text-muted-foreground">{t("vercelTokenDesc")}</p>
          </div>

          {/* Stripe Secret Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stripe-secret-key" className="flex items-center gap-2">
                {t("stripeSecretKey")}
                {savedKeys["stripe_secret_key"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
              </Label>
              <a href="https://dashboard.stripe.com/apikeys"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                {t("createToken")} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Input id="stripe-secret-key" type="password" value={stripeSecretKey}
              onChange={(e) => setStripeSecretKey(e.target.value)}
              placeholder={savedKeys["stripe_secret_key"] ? "••••••••••••••••" : t("stripeSecretKeyPlaceholder")} />
            <p className="text-xs text-muted-foreground">{t("stripeSecretKeyDesc")}</p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="openai-key" className="flex items-center gap-2">
                {t("openaiApiKey")}
                {savedKeys["openai_api_key"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
              </Label>
              <a href="https://platform.openai.com/api-keys"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                {t("createToken")} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Input id="openai-key" type="password" value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder={savedKeys["openai_api_key"] ? "••••••••••••••••" : "sk-..."} />
            <p className="text-xs text-muted-foreground">{t("openaiApiKeyDesc")}</p>
          </div>

          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saved ? t("saved") : saving ? t("saving") : t("save")}
          </Button>
        </CardContent>
      </Card>

      {/* Cron Auto-sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("cron.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("cron.desc")}</p>

          <div className="space-y-2">
            <Label>{t("cron.url")}</Label>
            <div className="flex gap-2">
              <Input readOnly value={cronLoading ? t("cron.loading") : cronUrl}
                className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopyCronUrl} disabled={!cronUrl}>
                {cronCopied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={loadCronSecret} disabled={cronLoading}>
                <RefreshCw className={`h-4 w-4 ${cronLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("cron.urlDesc")}</p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("cron.howTo")}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline">cron-job.org</a>
                {t("cron.step1")}
              </li>
              <li>{t("cron.step2")}</li>
              <li>{t("cron.step3")}</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
