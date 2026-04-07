import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { milestones } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const rows = projectId
    ? await db.select().from(milestones).where(eq(milestones.projectId, parseInt(projectId))).orderBy(desc(milestones.occurredAt))
    : await db.select().from(milestones).orderBy(desc(milestones.occurredAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    projectId: number;
    title: string;
    description?: string;
    icon?: string;
    occurredAt: string;
  };

  const inserted = await db
    .insert(milestones)
    .values({
      projectId: body.projectId,
      title: body.title,
      description: body.description ?? null,
      icon: body.icon ?? "🎯",
      occurredAt: body.occurredAt,
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
