// lib/scheduler/worker-processor.ts
import { Post, PostStatus, Platform } from "@/lib/types";
import { prisma } from "@/lib/prisma";

const DAILY_CAPS: Record<Platform, number> = { X: 12, THREADS: 12 };
const MIN_INTERVAL_SECONDS: Record<Platform, number> = { X: 900, THREADS: 900 };

// ── Safety check
interface SafetyCheck { safe: boolean; reason?: string; waitSeconds?: number; }

async function checkPostingSafety(socialAccountId: string, platform: Platform): Promise<SafetyCheck> {
  const account = await (prisma.socialAccount as any).findUniqueOrThrow({
    where: { id: socialAccountId },
  });

  if (!account.isActive) return { safe: false, reason: "Akun dinonaktifkan." };

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const dailyCap = DAILY_CAPS[platform];

  const todayCount = await (prisma.post as any).count({
    where: { socialAccountId, status: "PUBLISHED", publishedAt: { gte: todayStart } },
  });

  if (todayCount >= dailyCap) {
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { safe: false, reason: `Daily cap ${dailyCap} tercapai.`, waitSeconds: (tomorrow.getTime() - Date.now()) / 1000 };
  }

  if (account.lastPostedAt) {
    const elapsed = (Date.now() - new Date(account.lastPostedAt).getTime()) / 1000;
    const minInterval = MIN_INTERVAL_SECONDS[platform];
    if (elapsed < minInterval) {
      return { safe: false, reason: `Terlalu cepat. Tunggu ${Math.ceil((minInterval - elapsed) / 60)} menit.`, waitSeconds: minInterval - elapsed };
    }
  }

  return { safe: true };
}

// ── Variant picker
function pickVariant(post: Post): { content: string; variantIndex: number | null } {
  const variants = post.contentVariants as string[] | null;
  if (!variants || variants.length === 0) return { content: post.content, variantIndex: null };
  const idx = Math.floor(Math.random() * variants.length);
  return { content: variants[idx], variantIndex: idx };
}

// ── Process single post — dynamic import of platform publishers
async function processSinglePost(post: Post & { socialAccount: { id: string; platform: Platform } }): Promise<void> {
  const { socialAccount } = post;

  const safety = await checkPostingSafety(socialAccount.id, socialAccount.platform);
  if (!safety.safe) {
    console.warn(`[Queue] Post ${post.id} ditunda: ${safety.reason}`);
    await (prisma.post as any).update({
      where: { id: post.id },
      data: { lastError: safety.reason, nextRetryAt: new Date(Date.now() + (safety.waitSeconds ?? 3600) * 1000) },
    });
    return;
  }

  const { content, variantIndex } = pickVariant(post);

  // Dynamic import — hanya di-resolve di worker (Node.js), bukan di Next.js build
  let result: { success: boolean; postUrl?: string; postId?: string; error?: string } = { success: false };
  if (socialAccount.platform === "X") {
    const { postToX } = await import("@/lib/platforms/x-automation");
    result = await postToX(socialAccount.id, content);
  } else {
    // Threads disabled
    result = { success: false, error: "Threads integration has been removed." };
  }

  if (result.success) {
    await (prisma as any).$transaction([
      (prisma.post as any).update({
        where: { id: post.id },
        data: { status: "PUBLISHED", publishedAt: new Date(), platformPostId: result.postId, platformPostUrl: result.postUrl, selectedVariant: variantIndex, lastError: null },
      }),
      (prisma.socialAccount as any).update({
        where: { id: socialAccount.id },
        data: { totalPostCount: { increment: 1 }, lastPostedAt: new Date() },
      }),
    ]);
    console.log(`[Queue] ✅ ${post.id} → ${socialAccount.platform}: ${result.postUrl}`);
  } else {
    const retryCount = (post.retryCount || 0) + 1;
    // Delay dinamis: gagal ke-1 = tunda 5 menit, gagal ke-2 = 10 menit, max 1 jam
    const delayMs = Math.min(retryCount * 5 * 60_000, 60 * 60_000);
    const nextAttempt = new Date(Date.now() + delayMs);

    await (prisma.post as any).update({
      where: { id: post.id },
      data: { 
        status: "SCHEDULED", // Jangan pernah FAILED, ulangi terus
        lastError: result.error, 
        retryCount, 
        jitteredAt: nextAttempt // Update jadwal antrean ke nextAttempt
      },
    });
    console.error(`[Queue] ❌ ${post.id} gagal (${retryCount}x): ${result.error}. Akan dicoba lagi otomatis.`);
  }
}

// ── Evergreen Content Recycler
async function recyclePostsForEmptyAccounts(): Promise<void> {
  const accounts = await (prisma.socialAccount as any).findMany({
    where: { isActive: true },
  });

  for (const account of accounts) {
    const scheduledCount = await (prisma.post as any).count({
      where: { socialAccountId: account.id, status: "SCHEDULED" },
    });

    if (scheduledCount === 0) {
      const publishedCount = await (prisma.post as any).count({
        where: { socialAccountId: account.id, status: "PUBLISHED" },
      });

      // Threshold: minimal 100 published posts untuk mulai daur ulang
      if (publishedCount >= 100) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let candidates = await (prisma.post as any).findMany({
          where: {
            socialAccountId: account.id,
            status: "PUBLISHED",
            publishedAt: { lt: thirtyDaysAgo },
          },
          select: { id: true, content: true, contentVariants: true, platform: true, userId: true, batchId: true },
        });

        if (candidates.length === 0) {
          // Fallback ke 14 hari
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
          candidates = await (prisma.post as any).findMany({
            where: {
              socialAccountId: account.id,
              status: "PUBLISHED",
              publishedAt: { lt: fourteenDaysAgo },
            },
            select: { id: true, content: true, contentVariants: true, platform: true, userId: true, batchId: true },
          });
        }

        if (candidates.length > 0) {
          const randomPost = candidates[Math.floor(Math.random() * candidates.length)];
          const nextSchedule = new Date();
          // Jadwalkan untuk 1 jam ke depan dari sekarang
          nextSchedule.setHours(nextSchedule.getHours() + 1);

          await (prisma.post as any).create({
            data: {
              userId: randomPost.userId,
              socialAccountId: account.id,
              batchId: randomPost.batchId,
              platform: randomPost.platform,
              status: "SCHEDULED",
              content: randomPost.content,
              contentVariants: randomPost.contentVariants,
              scheduledAt: nextSchedule,
              jitteredAt: nextSchedule,
              jitterSeconds: 0,
            },
          });
          console.log(`[Queue] ♻️ Evergreen Recycle: Akun ${account.id} menjadwalkan ulang post ${randomPost.id}`);
        }
      }
    }
  }
}

// ── Main processor
export async function processScheduledQueue(): Promise<void> {
  // Pastikan antrean selalu hidup dengan mendaur ulang konten jika syarat terpenuhi
  await recyclePostsForEmptyAccounts();

  const now = new Date();
  const duePosts = await (prisma.post as any).findMany({
    where: { status: "SCHEDULED", jitteredAt: { lte: now } },
    include: { socialAccount: { select: { id: true, platform: true } } },
    orderBy: [
      { platform: "desc" },
      { jitteredAt: "asc" },
    ],
    take: 5,
  });

  if (duePosts.length === 0) return;
  console.log(`[Queue] Memproses ${duePosts.length} post...`);

  for (const post of duePosts) {
    await processSinglePost(post);
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5000) + 3000));
  }
}
