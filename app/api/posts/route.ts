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
  
  // Pagination
  const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const skip = (page - 1) * limit;

  // Date filtering (scheduledAt)
  const month = searchParams.get("month"); // "1" to "12"
  const year = searchParams.get("year");
  const date = searchParams.get("date"); // "YYYY-MM-DD"

  let scheduledAtFilter: any = undefined;

  if (date) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    scheduledAtFilter = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    scheduledAtFilter = {
      gte: startDate,
      lte: endDate,
    };
  }

  const where = {
    userId: session.user.id,
    ...(status && status !== "ALL" && { status: status as never }),
    ...(platform && platform !== "ALL" && { platform: platform as never }),
    ...(scheduledAtFilter && { scheduledAt: scheduledAtFilter }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        socialAccount: { select: { platformUsername: true, platform: true } },
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ 
    posts, 
    total, 
    page, 
    totalPages: Math.ceil(total / limit) 
  });
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
