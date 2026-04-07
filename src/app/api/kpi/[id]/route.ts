import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { kpiMetrics, kpiValues } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const metricId = parseInt(id);

  const [metric, values] = await Promise.all([
    db.query.kpiMetrics.findFirst({ where: eq(kpiMetrics.id, metricId) }),
    db.select().from(kpiValues).where(eq(kpiValues.metricId, metricId)).orderBy(desc(kpiValues.recordedAt)).limit(90),
  ]);

  if (!metric) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ metric, values });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(kpiMetrics).where(eq(kpiMetrics.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
