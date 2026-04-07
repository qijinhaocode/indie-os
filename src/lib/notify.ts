import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

export async function sendDownAlert(context: {
  projectName: string;
  integrationLabel: string;
  url?: string;
  status: string;
  statusCode?: number | null;
  error?: string | null;
}) {
  const [webhookUrl, tgToken, tgChatId] = await Promise.all([
    getSetting("notify_webhook_url"),
    getSetting("notify_telegram_token"),
    getSetting("notify_telegram_chat_id"),
  ]);

  const message = `🔴 Service Down\n\nProject: ${context.projectName}\nService: ${context.integrationLabel}\nStatus: ${context.status}${context.statusCode ? ` (HTTP ${context.statusCode})` : ""}${context.url ? `\nURL: ${context.url}` : ""}${context.error ? `\nError: ${context.error}` : ""}`;

  const tasks: Promise<unknown>[] = [];

  // Generic webhook (Slack / Discord / custom)
  if (webhookUrl) {
    tasks.push(
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, content: message }),
      }).catch((e) => console.error("[notify] webhook failed:", e))
    );
  }

  // Telegram
  if (tgToken && tgChatId) {
    tasks.push(
      fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: message,
          parse_mode: "HTML",
        }),
      }).catch((e) => console.error("[notify] telegram failed:", e))
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}
