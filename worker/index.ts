// worker/index.ts
// Worker mandiri yang berjalan di luar Next.js.
// Jalankan di VPS/Railway/Render dengan: npm run worker
//
// Cara kerja:
// 1. Poll database setiap 60 detik
// 2. Temukan post dengan status SCHEDULED dan jitteredAt <= sekarang
// 3. Publish via Playwright ke X atau Threads
// 4. Idle dengan jitter delay agar tidak terlihat seperti cron mekanis
//
// Deploy mandiri (terpisah dari Next.js app):
//   Railway → deploy sebagai service baru, env vars sama dengan web app
//   PM2      → pm2 start "npm run worker" --name socialqueue-worker

import "dotenv/config";
import { processScheduledQueue } from "@/lib/scheduler/worker-processor";
import { closeBrowser } from "@/lib/platforms/browser-manager";
import { prisma } from "@/lib/prisma";

const BASE_INTERVAL_MS = 60_000; // Poll setiap 1 menit

function workerJitter(): number {
  // Tambah jitter 0–30 detik pada interval worker itu sendiri
  // agar timestamp polling tidak selalu tepat di menit ke-0
  return Math.floor(Math.random() * 30_000);
}

async function runWorker(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════╗
║   SocialQueue Worker — Playwright Mode   ║
║   Started: ${new Date().toISOString()}  ║
╚══════════════════════════════════════════╝
`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Menerima ${signal}, menutup browser dan koneksi DB...`);
    await closeBrowser();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Main loop
  while (true) {
    const startTime = Date.now();

    try {
      await processScheduledQueue();
    } catch (err) {
      console.error("[Worker] Error dalam queue processor:", err);
      // Jangan crash — log dan lanjutkan ke iterasi berikutnya
    }

    const elapsed = Date.now() - startTime;
    const waitMs = Math.max(0, BASE_INTERVAL_MS - elapsed) + workerJitter();

    console.log(
      `[Worker] Selesai dalam ${elapsed}ms. ` +
      `Polling berikutnya dalam ${Math.ceil(waitMs / 1000)}s...`
    );

    await new Promise((r) => setTimeout(r, waitMs));
  }
}

runWorker().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
