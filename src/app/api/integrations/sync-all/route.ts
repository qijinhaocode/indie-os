import { NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const allIntegrations = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.enabled, true));

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const results = await Promise.allSettled(
      allIntegrations.map((i) =>
        fetch(`${baseUrl}/api/integrations/${i.id}/sync`, { method: "POST" })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ total: allIntegrations.length, succeeded, failed });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sync all failed" }, { status: 500 });
  }
}
