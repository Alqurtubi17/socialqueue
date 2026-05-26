export const dynamic = "force-dynamic";
// app/api/accounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      platform: true,
      platformUsername: true,
      avatarUrl: true,
      sessionValid: true,
      sessionExpiresAt: true,
      isActive: true,
      totalPostCount: true,
      lastPostedAt: true,
      dailyPostCount: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform, username, password } = await req.json();

  if (!platform || !username || !password) {
    return NextResponse.json(
      { error: "platform, username, dan password wajib diisi." },
      { status: 400 }
    );
  }

  // Validasi platform enum
  if (platform !== "X" && platform !== "THREADS") {
    return NextResponse.json(
      { error: "Platform tidak valid. Hanya menerima X atau THREADS." },
      { status: 400 }
    );
  }

  // Cek duplikat
  const existing = await prisma.socialAccount.findFirst({
    where: { userId: session.user.id, platform, platformUsername: username },
  });
  if (existing) {
    return NextResponse.json({ error: "Akun ini sudah terhubung." }, { status: 409 });
  }

  // Enkripsi kredensial sebelum menyimpan
  const account = await prisma.socialAccount.create({
    data: {
      userId: session.user.id,
      platform,
      platformUsername: username,
      loginUsername: encrypt(username),
      loginPassword: encrypt(password),
      isActive: true,
    },
    select: {
      id: true, platform: true, platformUsername: true, isActive: true,
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const account = await prisma.socialAccount.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  await prisma.socialAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
