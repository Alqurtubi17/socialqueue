export const dynamic = "force-dynamic";
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedPost(id: string, userId: string) {
  return prisma.post.findFirst({ where: { id, userId } });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post = await getOwnedPost(params.id, session.user.id);
  if (!post) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post = await getOwnedPost(params.id, session.user.id);
  if (!post) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });

  if (post.status === "PUBLISHED") {
    return NextResponse.json({ error: "Post yang sudah terbit tidak bisa diedit." }, { status: 400 });
  }

  const body = await req.json();
  const updateData: Record<string, any> = {};

  if (body.content !== undefined) {
    if (typeof body.content !== "string") {
      return NextResponse.json({ error: "Content harus berupa string." }, { status: 400 });
    }
    const maxLimit = post.platform === "X" ? 280 : 500;
    if (body.content.length > maxLimit) {
      return NextResponse.json({ error: `Konten untuk ${post.platform} maksimal ${maxLimit} karakter.` }, { status: 400 });
    }
    updateData.content = body.content;
  }

  if (body.contentVariants !== undefined) {
    if (!Array.isArray(body.contentVariants)) {
      return NextResponse.json({ error: "Content variants harus berupa array string." }, { status: 400 });
    }
    updateData.contentVariants = body.contentVariants;
  }

  if (body.scheduledAt !== undefined) {
    if (body.scheduledAt === null) {
      updateData.scheduledAt = null;
      updateData.jitteredAt = null;
      updateData.jitterSeconds = null;
    } else {
      const date = new Date(body.scheduledAt);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Format tanggal scheduledAt tidak valid." }, { status: 400 });
      }
      updateData.scheduledAt = date;
      const targetStatus = body.status !== undefined ? body.status : post.status;
      if (targetStatus === "SCHEDULED") {
        const { calculateJitter } = await import("@/lib/scheduler/core");
        const jitterSeconds = calculateJitter(60, 900);
        updateData.jitterSeconds = jitterSeconds;
        updateData.jitteredAt = new Date(date.getTime() + jitterSeconds * 1000);
      }
    }
  }

  if (body.status !== undefined) {
    const allowedStatuses = ["DRAFT", "SCHEDULED", "CANCELLED"];
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status tidak valid. Hanya menerima DRAFT, SCHEDULED, atau CANCELLED." }, { status: 400 });
    }
    updateData.status = body.status;

    if (body.status === "SCHEDULED") {
      const schedAt = updateData.scheduledAt !== undefined ? updateData.scheduledAt : post.scheduledAt;
      if (!schedAt) {
        return NextResponse.json({ error: "scheduledAt wajib diisi untuk menjadwalkan post." }, { status: 400 });
      }
      if (updateData.jitteredAt === undefined) {
        const { calculateJitter } = await import("@/lib/scheduler/core");
        const jitterSeconds = calculateJitter(60, 900);
        updateData.jitterSeconds = jitterSeconds;
        updateData.jitteredAt = new Date(new Date(schedAt).getTime() + jitterSeconds * 1000);
      }
    } else if (body.status === "DRAFT" || body.status === "CANCELLED") {
      updateData.jitteredAt = null;
      updateData.jitterSeconds = null;
    }
  }

  const updated = await prisma.post.update({ where: { id: params.id }, data: updateData });
  return NextResponse.json({ post: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post = await getOwnedPost(params.id, session.user.id);
  if (!post) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });

  await prisma.post.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
