// components/dashboard/PostQueue.tsx
import { prisma } from "@/lib/prisma";

const STATUS_STYLE: Record<string, string> = {
  DRAFT:     "bg-zinc-500/10 text-zinc-400",
  APPROVED:  "bg-emerald-500/10 text-emerald-400",
  SCHEDULED: "bg-violet-500/10 text-violet-400",
  PUBLISHED: "bg-blue-500/10 text-blue-400",
  FAILED:    "bg-red-500/10 text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", APPROVED: "Disetujui", SCHEDULED: "Terjadwal",
  PUBLISHED: "Terbit", FAILED: "Gagal", CANCELLED: "Dibatalkan",
};

export async function PostQueue({ userId, limit = 10 }: { userId: string; limit?: number }) {
  const posts = await prisma.post.findMany({
    where: {
      userId,
      status: { in: ["DRAFT", "APPROVED", "SCHEDULED"] },
    },
    include: {
      socialAccount: { select: { platformUsername: true } },
    },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
    take: limit,
  });

  if (posts.length === 0) {
    return (
      <div className="card p-8 text-center text-zinc-600 text-sm">
        <p className="text-2xl mb-2">📭</p>
        <p>Tidak ada post aktif. <a href="/ai-bank/generate" className="text-emerald-500 hover:underline">Generate konten baru</a></p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <div key={post.id} className="card card-hover p-4 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                {post.platform}
              </span>
              <span className={`badge text-[11px] ${STATUS_STYLE[post.status] ?? ""}`}>
                {STATUS_LABEL[post.status] ?? post.status}
              </span>
              <span className="text-[11px] text-zinc-600">@{post.socialAccount.platformUsername}</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 whitespace-pre-line">
              {post.content}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {post.jitteredAt ? (
              <div>
                <p className="text-[11px] text-zinc-500">
                  {new Date(post.jitteredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </p>
                <p className="text-[11px] text-zinc-600">
                  {new Date(post.jitteredAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {post.jitterSeconds && (
                  <p className="text-[10px] text-emerald-600 mt-0.5">+{post.jitterSeconds}s jitter</p>
                )}
              </div>
            ) : post.scheduledAt ? (
              <p className="text-[11px] text-zinc-600">
                {new Date(post.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </p>
            ) : (
              <p className="text-[11px] text-zinc-700">Belum terjadwal</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
