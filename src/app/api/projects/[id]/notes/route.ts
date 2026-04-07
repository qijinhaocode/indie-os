import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const note = await db.query.projectNotes.findFirst({
    where: eq(projectNotes.projectId, parseInt(id)),
  });
  return NextResponse.json({ content: note?.content ?? "" });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = (await req.json()) as { content: string };
  const projectId = parseInt(id);

  const existing = await db.query.projectNotes.findFirst({
    where: eq(projectNotes.projectId, projectId),
  });

  if (existing) {
    await db
      .update(projectNotes)
      .set({ content, updatedAt: new Date().toISOString() })
      .where(eq(projectNotes.projectId, projectId));
  } else {
    await db.insert(projectNotes).values({ projectId, content });
  }

  return NextResponse.json({ success: true });
}
