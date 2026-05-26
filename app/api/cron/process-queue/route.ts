export const dynamic = "force-dynamic";
// app/api/cron/process-queue/route.ts
// Endpoint ini dipanggil oleh QStash atau layanan cron eksternal setiap menit.
// Dilindungi oleh CRON_SECRET untuk mencegah panggilan tidak sah.

import { NextRequest, NextResponse } from "next/server";
import { processScheduledQueue } from "@/lib/scheduler/queue-processor";

export async function POST(req: NextRequest) {
  // Validasi Authorization header
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await processScheduledQueue();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[Cron] Queue error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Jika menggunakan Vercel Cron Jobs (vercel.json):
// { "crons": [{ "path": "/api/cron/process-queue", "schedule": "* * * * *" }] }
// Catatan: Vercel Cron tidak bisa jalankan Playwright. Gunakan worker/index.ts di VPS.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await processScheduledQueue();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
