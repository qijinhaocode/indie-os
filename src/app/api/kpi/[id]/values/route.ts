import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { kpiValues } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    value: number;
    recordedAt: string;
    note?: string;
  };

  const inserted = await db
    .insert(kpiValues)
    .values({
      metricId: parseInt(id),
      value: body.value,
      recordedAt: body.recordedAt,
      note: body.note ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const valueId = searchParams.get("valueId");
  if (valueId) {
    await db.delete(kpiValues).where(eq(kpiValues.id, parseInt(valueId)));
  } else {
    await db.delete(kpiValues).where(eq(kpiValues.metricId, parseInt(id)));
  }
  return NextResponse.json({ success: true });
}
