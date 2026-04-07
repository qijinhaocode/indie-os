import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { revenueEntries, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const entries = await db
      .select({
        id: revenueEntries.id,
        projectId: revenueEntries.projectId,
        projectName: projects.name,
        amount: revenueEntries.amount,
        currency: revenueEntries.currency,
        type: revenueEntries.type,
        source: revenueEntries.source,
        recordedAt: revenueEntries.recordedAt,
        createdAt: revenueEntries.createdAt,
      })
      .from(revenueEntries)
      .leftJoin(projects, eq(revenueEntries.projectId, projects.id))
      .orderBy(desc(revenueEntries.recordedAt));
    return NextResponse.json(entries);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch revenue" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [created] = await db
      .insert(revenueEntries)
      .values({
        projectId: parseInt(body.projectId),
        amount: parseFloat(body.amount),
        currency: body.currency ?? "USD",
        type: body.type ?? "mrr",
        source: body.source || null,
        recordedAt: body.recordedAt,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create revenue entry" }, { status: 500 });
  }
}
