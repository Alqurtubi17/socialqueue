import "dotenv/config";
import { processScheduledQueue } from "@/lib/scheduler/queue-processor";
import { closeBrowser } from "@/lib/platforms/browser-manager";
import { prisma } from "@/lib/prisma";

async function runCron() {
  console.log(`[Cron] Memulai pemrosesan antrean pada ${new Date().toISOString()}`);
  
  try {
    await processScheduledQueue();
    console.log("[Cron] Selesai memproses antrean.");
  } catch (err) {
    console.error("[Cron] Error dalam queue processor:", err);
  } finally {
    await closeBrowser();
    await prisma.$disconnect();
  }
}

runCron().catch((err) => {
  console.error("[Cron] Fatal error:", err);
  process.exit(1);
});
