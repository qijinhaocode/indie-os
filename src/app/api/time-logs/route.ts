import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { timeLogs, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const logs = await db
      .select({
        id: timeLogs.id,
        projectId: timeLogs.projectId,
        projectName: projects.name,
        minutes: timeLogs.minutes,
        description: timeLogs.description,
        loggedAt: timeLogs.loggedAt,
        createdAt: timeLogs.createdAt,
      })
      .from(timeLogs)
      .leftJoin(projects, eq(timeLogs.projectId, projects.id))
      .orderBy(desc(timeLogs.loggedAt));
    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch time logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hours = parseInt(body.hours ?? "0");
    const minutes = parseInt(body.minutes ?? "0");
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      return NextResponse.json({ error: "Time must be greater than 0" }, { status: 400 });
    }

    const [created] = await db
      .insert(timeLogs)
      .values({
        projectId: parseInt(body.projectId),
        minutes: totalMinutes,
        description: body.description || null,
        loggedAt: body.loggedAt,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create time log" }, { status: 500 });
  }
}
