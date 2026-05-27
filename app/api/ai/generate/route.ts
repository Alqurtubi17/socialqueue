export const dynamic = "force-dynamic";
// app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateContentBatch } from "@/lib/ai/gemini-content-generator";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { socialAccountId, platform, businessContext, days, postsPerDay, generateVariants } = body;

  if (!socialAccountId || !platform || !businessContext) {
    return NextResponse.json(
      { error: "socialAccountId, platform, dan businessContext wajib diisi." },
      { status: 400 }
    );
  }

  // Validasi platform enum
  if (platform !== "X") {
    return NextResponse.json({ error: "Platform tidak valid. Hanya menerima X." }, { status: 400 });
  }

  // Validasi kepemilikan akun sosial (IDOR protection)
  const socialAccount = await prisma.socialAccount.findFirst({
    where: { id: socialAccountId, userId: session.user.id }
  });
  if (!socialAccount) {
    return NextResponse.json({ error: "Social account tidak ditemukan atau bukan milik Anda." }, { status: 404 });
  }

  try {
    const result = await generateContentBatch({
      userId: session.user.id,
      socialAccountId,
      platform,
      businessContext,
      days: days ?? 30,
      postsPerDay: postsPerDay ?? 1,
      generateVariants: generateVariants ?? true,
    });

    // Simpan context untuk auto-generate harian
    await prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        autoGenerateContext: businessContext,
        autoGenerateEnabled: true,
      }
    });

    return NextResponse.json({ ...result }, { status: 201 });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Gagal melakukan generate konten." }, { status: 500 });
  }
}
