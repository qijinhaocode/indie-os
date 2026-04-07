import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { revenueEntries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(revenueEntries).where(eq(revenueEntries.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
