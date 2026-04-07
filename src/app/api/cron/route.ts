import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function getOrCreateCronSecret(): Promise<string> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "cron_secret"),
  });
  if (row?.value) return row.value;

  const secret = generateSecret();
  await db.insert(appSettings).values({
    key: "cron_secret",
    value: secret,
    updatedAt: new Date().toISOString(),
  });
  return secret;
}

export async function GET(req: NextRequest) {
  const cronSecret = await getOrCreateCronSecret();

  // Support both Bearer token and ?secret= query param for easy browser testing
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const token = authHeader?.replace("Bearer ", "") ?? querySecret;

  if (!token || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const baseUrl = req.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/integrations/sync-all`, {
      method: "POST",
    });
    const data = await res.json() as { results?: unknown[] };
    return NextResponse.json({
      ok: true,
      triggeredAt: new Date().toISOString(),
      syncedCount: Array.isArray(data.results) ? data.results.length : 0,
    });
  } catch (err) {
    console.error("[cron] sync-all failed:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

// Return the cron URL and secret for display in Settings
export async function POST() {
  const secret = await getOrCreateCronSecret();
  return NextResponse.json({ secret });
}
