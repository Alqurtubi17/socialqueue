export const dynamic = "force-dynamic";
// app/api/posts/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// Import dihapus karena sudah langsung dijalankan di updateMany

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduledAt } = await req.json();
  if (!scheduledAt) return NextResponse.json({ error: "scheduledAt wajib diisi." }, { status: 400 });

  const { calculateJitter } = await import("@/lib/scheduler/core");
  const jitterSeconds = calculateJitter(60, 900);
  const scheduledDate = new Date(scheduledAt);
  const jitteredAt = new Date(scheduledDate.getTime() + jitterSeconds * 1000);

  const updateResult = await prisma.post.updateMany({
    where: { 
      id: params.id, 
      userId: session.user.id,
      status: { in: ["DRAFT", "FAILED"] }
    },
    data: {
      status: "SCHEDULED",
      scheduledAt: scheduledDate,
      jitteredAt,
      jitterSeconds,
      lastError: null
    }
  });

  if (updateResult.count === 0) {
    return NextResponse.json({ 
      error: "Post tidak ditemukan atau status bukan DRAFT/FAILED." 
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    jitteredAt,
    jitterSeconds,
    message: `Post dijadwalkan pada ${jitteredAt.toISOString()} (+${jitterSeconds}s jitter)`,
  });
}
