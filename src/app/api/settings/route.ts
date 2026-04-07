import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const settings = await db.select().from(appSettings);
    const result: Record<string, string> = {};
    for (const s of settings) {
      // mask token values for security
      result[s.key] = s.value ? "***saved***" : "";
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>;
    for (const [key, value] of Object.entries(body)) {
      if (!value || value === "***saved***") continue;
      await db
        .insert(appSettings)
        .values({ key, value, updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value, updatedAt: new Date().toISOString() },
        });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
