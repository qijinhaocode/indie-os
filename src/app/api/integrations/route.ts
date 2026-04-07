import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: integrations.id,
        projectId: integrations.projectId,
        projectName: projects.name,
        type: integrations.type,
        config: integrations.config,
        cachedData: integrations.cachedData,
        lastSyncedAt: integrations.lastSyncedAt,
        enabled: integrations.enabled,
        createdAt: integrations.createdAt,
      })
      .from(integrations)
      .leftJoin(projects, eq(integrations.projectId, projects.id))
      .orderBy(desc(integrations.createdAt));
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [created] = await db
      .insert(integrations)
      .values({
        projectId: parseInt(body.projectId),
        type: body.type,
        config: JSON.stringify(body.config ?? {}),
        enabled: true,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 });
  }
}
