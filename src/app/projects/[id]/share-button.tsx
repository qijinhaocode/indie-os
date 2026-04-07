"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2, Check, Copy, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface ShareButtonProps {
  projectId: number;
  currentToken: string | null;
}

export function ShareButton({ projectId, currentToken }: ShareButtonProps) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [token, setToken] = useState<string | null>(currentToken);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = token && typeof window !== "undefined"
    ? `${window.location.origin}/share/${token}`
    : token
    ? `/share/${token}`
    : null;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json() as { token: string };
      setToken(data.token);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!confirm(t("share.revokeConfirm"))) return;
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      setToken(null);
      setShowPanel(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    const fullUrl = shareUrl.startsWith("/")
      ? `${window.location.origin}${shareUrl}`
      : shareUrl;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (!token) {
            handleGenerate();
          } else {
            setShowPanel((p) => !p);
          }
        }}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">
          {token ? t("share.manage") : loading ? t("share.generating") : t("share.create")}
        </span>
      </button>

      {showPanel && token && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("share.publicLink")}</p>
            <button onClick={() => setShowPanel(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl ?? ""}
              className="flex-1 min-w-0 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs font-mono text-muted-foreground"
            />
            <button
              onClick={handleCopy}
              className="flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-accent transition-colors shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">{t("share.desc")}</p>

          <div className="flex gap-2">
            <a
              href={`/share/${token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t("share.preview")}
            </a>
            <button
              onClick={handleRevoke}
              disabled={loading}
              className="flex-1 text-center rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {t("share.revoke")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
