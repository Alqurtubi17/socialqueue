import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWeeklyTemplate } from "@/lib/ai/auto-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  // Verifikasi Bearer Token dari Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeAccounts = await prisma.socialAccount.findMany({
      where: {
        autoGenerateEnabled: true,
        autoGenerateContext: { not: undefined },
      },
      select: { id: true }
    });

    if (activeAccounts.length === 0) {
      return NextResponse.json({ message: "Tidak ada akun dengan auto-generate." });
    }

    const results = [];
    
    for (const account of activeAccounts) {
      try {
        const result = await updateWeeklyTemplate(account.id);
        results.push({ accountId: account.id, status: "success", newMessages: result.newMessages });
      } catch (err: any) {
        console.error(`Gagal update template mingguan untuk akun ${account.id}:`, err);
        results.push({ accountId: account.id, status: "error", error: err.message });
      }
    }

    return NextResponse.json({ message: "Weekly template update selesai", results });
  } catch (error: any) {
    console.error("Weekly Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
