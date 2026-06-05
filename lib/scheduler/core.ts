// lib/scheduler/core.ts
import { prisma } from "@/lib/prisma";

// ── Jitter Engine (Gaussian / Box-Muller)
export function calculateJitter(minSeconds = 60, maxSeconds = 900): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const normalized = Math.max(0, Math.min(1, (z + 3) / 6));
  return Math.floor(minSeconds + normalized * (maxSeconds - minSeconds));
}

export async function applyJitterAndSchedule(
  postId: string,
  scheduledAt: Date
): Promise<{ jitteredAt: Date; jitterSeconds: number }> {
  const jitterSeconds = calculateJitter(60, 900);
  const jitteredAt = new Date(scheduledAt.getTime() + jitterSeconds * 1000);
  await (prisma.post as any).update({
    where: { id: postId },
    data: { status: "SCHEDULED", scheduledAt, jitteredAt, jitterSeconds, lastError: null },
  });
  console.log(`[Jitter] Post ${postId}: +${jitterSeconds}s → ${jitteredAt.toISOString()}`);
  return { jitteredAt, jitterSeconds };
}
