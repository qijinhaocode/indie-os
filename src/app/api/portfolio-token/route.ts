import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const KEY = "portfolio_token";

async function getOrCreate() {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, KEY) });
  if (row?.value) return row.value;
  const token = randomBytes(20).toString("hex");
  await db.insert(appSettings).values({ key: KEY, value: token }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value: token },
  });
  return token;
}

export async function GET() {
  const token = await getOrCreate();
  return NextResponse.json({ token });
}

export async function POST() {
  const token = randomBytes(20).toString("hex");
  await db.insert(appSettings).values({ key: KEY, value: token }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value: token },
  });
  return NextResponse.json({ token });
}
