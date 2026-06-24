import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyAutoPosts } from "@/lib/ai/auto-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max duration for pro plan, or adjust as needed

export async function GET(request: Request) {
  // Verifikasi Bearer Token dari Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Ambil semua akun aktif yang mengaktifkan auto-generate
    const activeAccounts = await prisma.socialAccount.findMany({
      where: {
        isActive: true,
        autoGenerateEnabled: true,
        autoGenerateContext: { not: undefined }, // Pastikan context ada
      },
      select: { id: true }
    });

    if (activeAccounts.length === 0) {
      return NextResponse.json({ message: "Tidak ada akun aktif dengan auto-generate." });
    }

    const results = [];
    
    // 2. Generate konten untuk setiap akun
    for (const account of activeAccounts) {
      try {
        const result = await generateDailyAutoPosts(account.id);
        results.push({ accountId: account.id, status: "success", count: result.count });
      } catch (err: any) {
        console.error(`Gagal auto-generate untuk akun ${account.id}:`, err);
        results.push({ accountId: account.id, status: "error", error: err.message });
      }
    }

    return NextResponse.json({ message: "Daily generate selesai", results });
  } catch (error: any) {
    console.error("Daily Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
