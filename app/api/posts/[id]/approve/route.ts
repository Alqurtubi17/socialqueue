export const dynamic = "force-dynamic";
// app/api/posts/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyJitterAndSchedule } from "@/lib/scheduler/core";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduledAt } = await req.json();
  if (!scheduledAt) return NextResponse.json({ error: "scheduledAt wajib diisi." }, { status: 400 });

  const post = await prisma.post.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!post) return NextResponse.json({ error: "Post tidak ditemukan." }, { status: 404 });
  if (post.status !== "DRAFT" && post.status !== "FAILED") {
    return NextResponse.json({ error: "Hanya post berstatus DRAFT atau FAILED yang bisa disetujui ulang." }, { status: 400 });
  }

  const { jitteredAt, jitterSeconds } = await applyJitterAndSchedule(
    params.id,
    new Date(scheduledAt)
  );

  return NextResponse.json({
    success: true,
    jitteredAt,
    jitterSeconds,
    message: `Post dijadwalkan pada ${jitteredAt.toISOString()} (+${jitterSeconds}s jitter)`,
  });
}
