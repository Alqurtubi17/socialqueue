// app/(dashboard)/scheduler/page.tsx
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SchedulerPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id!;

  const posts = await prisma.post.findMany({
    where: { userId },
    include: { socialAccount: { select: { platformUsername: true, platform: true } } },
    orderBy: [{ jitteredAt: "asc" }, { scheduledAt: "asc" }],
    take: 50,
  });

  const byStatus = {
    SCHEDULED: posts.filter((p) => p.status === "SCHEDULED"),
    APPROVED:  posts.filter((p) => p.status === "APPROVED"),
    DRAFT:     posts.filter((p) => p.status === "DRAFT"),
    PUBLISHED: posts.filter((p) => p.status === "PUBLISHED"),
    FAILED:    posts.filter((p) => p.status === "FAILED"),
  };

  const STATUS_LABEL: Record<string, string> = {
    SCHEDULED: "Terjadwal", APPROVED: "Disetujui", DRAFT: "Draft",
    PUBLISHED: "Terbit", FAILED: "Gagal",
  };
  const STATUS_STYLE: Record<string, string> = {
    SCHEDULED: "bg-violet-500/10 text-violet-400",
    APPROVED:  "bg-emerald-500/10 text-emerald-400",
    DRAFT:     "bg-zinc-500/10 text-zinc-400",
    PUBLISHED: "bg-blue-500/10 text-blue-400",
    FAILED:    "bg-red-500/10 text-red-400",
  };

  return (
    <div className="flex-1 overflow-auto">
      <header className="border-b border-[#141416] px-7 py-4 sticky top-0 bg-[#09090b] z-10">
        <h1 className="text-lg font-bold tracking-tight">Scheduler</h1>
        <p className="text-xs text-zinc-600 mt-0.5">
          {byStatus.SCHEDULED.length} post terjadwal · {byStatus.DRAFT.length} draft menunggu
        </p>
      </header>

      <div className="p-7 space-y-8">
        {(["SCHEDULED", "APPROVED", "DRAFT", "FAILED", "PUBLISHED"] as const).map((status) => {
          const group = byStatus[status];
          if (group.length === 0) return null;
          return (
            <section key={status}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
                <span className={`badge text-[11px] ${STATUS_STYLE[status]}`}>{group.length}</span>
              </div>
              <div className="space-y-2">
                {group.map((post) => (
                  <div key={post.id} className="card card-hover p-4 grid grid-cols-[1fr_auto] gap-4 items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-semibold">{post.platform}</span>
                        <span className="text-[11px] text-zinc-600">@{post.socialAccount.platformUsername}</span>
                        {post.contentVariants && (post.contentVariants as string[]).length > 0 && (
                          <span className="text-[11px] text-zinc-700">{(post.contentVariants as string[]).length} variasi</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 whitespace-pre-line">{post.content}</p>
                      {post.lastError && (
                        <p className="text-[11px] text-red-400 mt-2 bg-red-500/10 px-2 py-1 rounded">{post.lastError}</p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-zinc-600 space-y-0.5">
                      {post.jitteredAt && (
                        <>
                          <p className="text-zinc-400 font-medium">
                            {new Date(post.jitteredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p>{new Date(post.jitteredAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                          {post.jitterSeconds && <p className="text-emerald-600">+{post.jitterSeconds}s jitter</p>}
                        </>
                      )}
                      {!post.jitteredAt && post.scheduledAt && (
                        <p>{new Date(post.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p>
                      )}
                      {post.publishedAt && (
                        <p className="text-blue-400">
                          {new Date(post.publishedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {posts.length === 0 && (
          <div className="card p-12 text-center text-zinc-600">
            <p className="text-3xl mb-3">🗓️</p>
            <p className="font-semibold text-sm mb-1">Queue kosong</p>
            <p className="text-xs"><a href="/ai-bank/generate" className="text-emerald-500 hover:underline">Generate konten</a> dan setujui untuk mulai menjadwalkan</p>
          </div>
        )}
      </div>
    </div>
  );
}
