import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function getOrCreateStatusToken(): Promise<string> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "status_page_token"),
  });
  if (row?.value) return row.value;

  const token = crypto.randomBytes(20).toString("hex");
  await db.insert(appSettings).values({
    key: "status_page_token",
    value: token,
    updatedAt: new Date().toISOString(),
  });
  return token;
}

// GET: return current token (or generate)
export async function GET() {
  const token = await getOrCreateStatusToken();
  return NextResponse.json({ token });
}

// POST: regenerate token
export async function POST() {
  const newToken = crypto.randomBytes(20).toString("hex");
  await db
    .insert(appSettings)
    .values({ key: "status_page_token", value: newToken, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: newToken, updatedAt: new Date().toISOString() },
    });
  return NextResponse.json({ token: newToken });
}
