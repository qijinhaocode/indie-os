import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// POST: generate or revoke share token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json() as { action?: string };
  const action = body.action ?? "generate";

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "revoke") {
    await db
      .update(projects)
      .set({ shareToken: null })
      .where(eq(projects.id, projectId));
    return NextResponse.json({ token: null });
  }

  // Generate a new token if none exists
  const token = project.shareToken ?? crypto.randomBytes(20).toString("hex");
  if (!project.shareToken) {
    await db
      .update(projects)
      .set({ shareToken: token })
      .where(eq(projects.id, projectId));
  }

  return NextResponse.json({ token });
}
