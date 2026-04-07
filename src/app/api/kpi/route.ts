import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { kpiMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const rows = projectId
    ? await db.select().from(kpiMetrics).where(eq(kpiMetrics.projectId, parseInt(projectId))).orderBy(kpiMetrics.createdAt)
    : await db.select().from(kpiMetrics).orderBy(kpiMetrics.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    projectId: number;
    name: string;
    unit?: string;
    description?: string;
  };

  const inserted = await db
    .insert(kpiMetrics)
    .values({
      projectId: body.projectId,
      name: body.name,
      unit: body.unit ?? "",
      description: body.description ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
