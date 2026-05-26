// app/(dashboard)/dashboard/page.tsx
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostQueue } from "@/components/dashboard/PostQueue";

async function getDashboardStats(userId: string) {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  const [scheduled, drafts, published, accounts] = await Promise.all([
    prisma.post.count({ where: { userId, status: "SCHEDULED" } }),
    prisma.post.count({ where: { userId, status: "DRAFT" } }),
    prisma.post.count({
      where: { userId, status: "PUBLISHED", publishedAt: { gte: todayStart } },
    }),
    prisma.socialAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true, platform: true, platformUsername: true,
        sessionValid: true, totalPostCount: true, lastPostedAt: true,
      },
    }),
  ]);

  return { scheduled, drafts, published, accounts };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getDashboardStats(session!.user!.id!);

  const statCards = [
    { label: "Terjadwal", value: stats.scheduled, sub: "post aktif di queue" },
    { label: "Draft AI", value: stats.drafts, sub: "menunggu review kamu" },
    { label: "Terbit Hari Ini", value: stats.published, sub: "berhasil dipublish" },
    { label: "Akun Terhubung", value: stats.accounts.length, sub: "platform aktif" },
  ];

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="border-b border-[#141416] px-7 py-4 bg-[#09090b] sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>
          <a href="/ai-bank/generate" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z"/>
            </svg>
            Generate Konten AI
          </a>
        </div>
      </header>

      <div className="p-7 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="card card-hover p-5">
              <p className="section-label">{s.label}</p>
              <p className="text-3xl font-bold tabular-nums tracking-tight mt-1">{s.value}</p>
              <p className="text-xs text-zinc-600 mt-1.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Platform accounts */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Platform Terhubung</h2>
          <div className="grid grid-cols-2 gap-4">
            {stats.accounts.length === 0 ? (
              <div className="card p-6 col-span-2 text-center text-zinc-600 text-sm">
                Belum ada akun terhubung.{" "}
                <a href="/accounts" className="text-emerald-500 hover:underline">Hubungkan sekarang</a>
              </div>
            ) : (
              stats.accounts.map((acc) => (
                <div key={acc.id} className="card card-hover p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#18181b] flex items-center justify-center text-zinc-300">
                      {acc.platform === "X" ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4"></circle>
                          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4.5 8.4"></path>
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">@{acc.platformUsername}</p>
                      <p className="text-xs text-zinc-600">{acc.totalPostCount} post total</p>
                    </div>
                  </div>
                  <span className={`badge ${acc.sessionValid ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    <span className={`status-dot ${acc.sessionValid ? "bg-emerald-500 animate-pulse-slow" : "bg-red-500"}`}/>
                    {acc.sessionValid ? "Aktif" : "Session Mati"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Post Queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Antrian Post</h2>
            <a href="/scheduler" className="text-xs text-emerald-500 hover:text-emerald-400">Lihat semua →</a>
          </div>
          <PostQueue userId={session!.user!.id!} limit={8} />
        </div>
      </div>
    </div>
  );
}
