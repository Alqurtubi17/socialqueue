// Shared domain types — mirrors Prisma enums
// In production these come from @prisma/client after `prisma generate`
export type Platform = "X" | "THREADS";
export type PostStatus = "DRAFT" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "FAILED" | "CANCELLED";

export interface Post {
  id: string;
  userId: string;
  socialAccountId: string;
  batchId: string | null;
  content: string;
  contentVariants: unknown;
  selectedVariant: number | null;
  platform: Platform;
  status: PostStatus;
  scheduledAt: Date | null;
  jitteredAt: Date | null;
  jitterSeconds: number | null;
  publishedAt: Date | null;
  platformPostId: string | null;
  platformPostUrl: string | null;
  lastError: string | null;
  retryCount: number;
  nextRetryAt: Date | null;
  qstashJobId: string | null;
}
