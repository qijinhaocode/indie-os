"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, ExternalLink } from "lucide-react";

interface SettingsFormProps {
  savedKeys: Record<string, boolean>;
}

export function SettingsForm({ savedKeys }: SettingsFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [githubToken, setGithubToken] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const body: Record<string, string> = {};
    if (githubToken) body["github_token"] = githubToken;
    if (vercelToken) body["vercel_token"] = vercelToken;

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
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {t("apiKeys")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* GitHub Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="github-token" className="flex items-center gap-2">
                {t("githubToken")}
                {savedKeys["github_token"] && (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </Label>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=indie-os"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t("createToken")}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Input
              id="github-token"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder={savedKeys["github_token"] ? "••••••••••••••••" : t("githubTokenPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("githubTokenDesc")}</p>
          </div>

          {/* Vercel Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vercel-token" className="flex items-center gap-2">
                {t("vercelToken")}
                {savedKeys["vercel_token"] && (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </Label>
            </div>
            <Input
              id="vercel-token"
              type="password"
              value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
              placeholder={savedKeys["vercel_token"] ? "••••••••••••••••" : t("vercelTokenPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("vercelTokenDesc")}</p>
          </div>

          <Button onClick={handleSave} disabled={saving || (!githubToken && !vercelToken)}>
            {saved ? t("saved") : saving ? t("saving") : t("save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
