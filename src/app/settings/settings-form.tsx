"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ExternalLink, Copy, RefreshCw, Bell, Radio } from "lucide-react";

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
  const [webhookUrl, setWebhookUrl] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [digestEmail, setDigestEmail] = useState("");
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<"sent" | "error" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cronSecret, setCronSecret] = useState<string | null>(null);
  const [cronCopied, setCronCopied] = useState(false);
  const [cronLoading, setCronLoading] = useState(false);
  const [statusToken, setStatusToken] = useState<string | null>(null);
  const [statusCopied, setStatusCopied] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

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

  const loadStatusToken = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/status-token");
      const data = await res.json() as { token: string };
      setStatusToken(data.token);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCronSecret();
    loadStatusToken();
  }, [loadCronSecret, loadStatusToken]);

  const statusUrl = statusToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/status/${statusToken}`
    : "";

  async function handleCopyStatusUrl() {
    if (!statusUrl) return;
    await navigator.clipboard.writeText(statusUrl);
    setStatusCopied(true);
    setTimeout(() => setStatusCopied(false), 2000);
  }

  async function handleRegenStatusToken() {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/status-token", { method: "POST" });
      const data = await res.json() as { token: string };
      setStatusToken(data.token);
    } finally {
      setStatusLoading(false);
    }
  }

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
    if (webhookUrl) body["notify_webhook_url"] = webhookUrl;
    if (telegramBotToken) body["notify_telegram_token"] = telegramBotToken;
    if (telegramChatId) body["notify_telegram_chat_id"] = telegramChatId;
    if (resendApiKey) body["resend_api_key"] = resendApiKey;
    if (digestEmail) body["digest_email"] = digestEmail;

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
    setWebhookUrl("");
    setTelegramBotToken("");
    setTelegramChatId("");
    setResendApiKey("");
    setDigestEmail("");
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  const hasChanges = !!(githubToken || vercelToken || stripeSecretKey || openaiApiKey || webhookUrl || telegramBotToken || telegramChatId || resendApiKey || digestEmail);

  async function handleSendDigest() {
    setSendingDigest(true);
    setDigestResult(null);
    try {
      const res = await fetch("/api/digest", { method: "POST" });
      setDigestResult(res.ok ? "sent" : "error");
    } catch {
      setDigestResult("error");
    } finally {
      setSendingDigest(false);
      setTimeout(() => setDigestResult(null), 4000);
    }
  }

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

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t("notify.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">{t("notify.desc")}</p>

          {/* Generic Webhook */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url" className="flex items-center gap-2">
              {t("notify.webhookUrl")}
              {savedKeys["notify_webhook_url"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
            </Label>
            <Input id="webhook-url" type="url" value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={savedKeys["notify_webhook_url"] ? "••••••••" : "https://hooks.slack.com/... or Discord webhook"} />
            <p className="text-xs text-muted-foreground">{t("notify.webhookDesc")}</p>
          </div>

          {/* Telegram */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Telegram</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tg-token" className="flex items-center gap-2">
                  Bot Token
                  {savedKeys["notify_telegram_token"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                </Label>
                <Input id="tg-token" type="password" value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder={savedKeys["notify_telegram_token"] ? "••••••••" : "123456:ABC-..."} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tg-chat" className="flex items-center gap-2">
                  Chat ID
                  {savedKeys["notify_telegram_chat_id"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                </Label>
                <Input id="tg-chat" type="text" value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder={savedKeys["notify_telegram_chat_id"] ? "••••••••" : "-100123456789"} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("notify.telegramDesc")}</p>
          </div>

          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saved ? t("saved") : saving ? t("saving") : t("save")}
          </Button>
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("digest.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("digest.desc")}</p>

          <div className="space-y-2">
            <Label htmlFor="resend-key" className="flex items-center gap-2">
              {t("digest.resendKey")}
              {savedKeys["resend_api_key"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
            </Label>
            <div className="flex gap-2">
              <Input id="resend-key" type="password" value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder={savedKeys["resend_api_key"] ? "••••••••" : "re_xxxxxxxx"} />
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 shrink-0 text-xs text-primary hover:underline border border-border rounded-md px-2">
                {t("createToken")} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="digest-email" className="flex items-center gap-2">
              {t("digest.toEmail")}
              {savedKeys["digest_email"] && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
            </Label>
            <Input id="digest-email" type="email" value={digestEmail}
              onChange={(e) => setDigestEmail(e.target.value)}
              placeholder={savedKeys["digest_email"] ? "••••••••" : "you@example.com"} />
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saved ? t("saved") : saving ? t("saving") : t("save")}
            </Button>
            <Button variant="outline" onClick={handleSendDigest}
              disabled={sendingDigest || (!savedKeys["resend_api_key"] && !resendApiKey) || (!savedKeys["digest_email"] && !digestEmail)}>
              {sendingDigest ? t("digest.sending") : digestResult === "sent" ? t("digest.sent") : digestResult === "error" ? t("digest.error") : t("digest.sendNow")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("digest.cronTip")}</p>
        </CardContent>
      </Card>

      {/* Status Page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4" />
            {t("statusPage.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("statusPage.desc")}</p>

          <div className="space-y-2">
            <Label>{t("statusPage.url")}</Label>
            <div className="flex gap-2">
              <Input readOnly value={statusLoading ? t("cron.loading") : statusUrl}
                className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopyStatusUrl} disabled={!statusUrl}>
                {statusCopied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={handleRegenStatusToken} disabled={statusLoading}
                title={t("statusPage.regenerate")}>
                <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("statusPage.urlDesc")}</p>
          </div>

          {statusUrl && (
            <a href={`/status/${statusToken}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3" />
              {t("statusPage.preview")}
            </a>
          )}
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
