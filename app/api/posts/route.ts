export const dynamic = "force-dynamic";
// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const platform = searchParams.get("platform") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 500);

  const posts = await prisma.post.findMany({
    where: {
      userId: session.user.id,
      ...(status && { status: status as never }),
      ...(platform && { platform: platform as never }),
    },
    include: {
      socialAccount: { select: { platformUsername: true, platform: true } },
    },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
    take: limit,
  });

  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { socialAccountId, content, platform, scheduledAt } = body;

  if (!socialAccountId || !content || !platform) {
    return NextResponse.json({ error: "socialAccountId, content, dan platform wajib diisi." }, { status: 400 });
  }

  // Validasi platform enum
  if (platform !== "X" && platform !== "THREADS") {
    return NextResponse.json({ error: "Platform tidak valid. Hanya menerima X atau THREADS." }, { status: 400 });
  }

  // Validasi kepemilikan akun sosial (IDOR protection)
  const socialAccount = await prisma.socialAccount.findFirst({
    where: { id: socialAccountId, userId: session.user.id }
  });
  if (!socialAccount) {
    return NextResponse.json({ error: "Social account tidak ditemukan atau bukan milik Anda." }, { status: 404 });
  }

  // Validasi batas karakter
  const maxLimit = platform === "X" ? 280 : 500;
  if (content.length > maxLimit) {
    return NextResponse.json({ error: `Konten untuk ${platform} maksimal ${maxLimit} karakter.` }, { status: 400 });
  }

  // Validasi scheduledAt
  let parsedScheduledAt: Date | undefined = undefined;
  if (scheduledAt) {
    parsedScheduledAt = new Date(scheduledAt);
    if (isNaN(parsedScheduledAt.getTime())) {
      return NextResponse.json({ error: "Format tanggal scheduledAt tidak valid." }, { status: 400 });
    }
  }

  const post = await prisma.post.create({
    data: {
      userId: session.user.id,
      socialAccountId,
      content,
      platform,
      status: "DRAFT",
      ...(parsedScheduledAt && { scheduledAt: parsedScheduledAt }),
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
