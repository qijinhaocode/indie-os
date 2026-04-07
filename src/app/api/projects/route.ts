import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, type NewProject } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const all = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return NextResponse.json(all);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newProject: NewProject = {
      name: body.name,
      description: body.description,
      status: body.status ?? "active",
      repo: body.repo,
      domain: body.domain,
      techStack: body.techStack,
    };
    const [created] = await db.insert(projects).values(newProject).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
