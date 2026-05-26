"use client";
// app/(dashboard)/scheduler/page.tsx
import { useState, useEffect } from "react";

interface Post {
  id: string;
  content: string;
  platform: string;
  status: string;
  scheduledAt: string | null;
  jitteredAt: string | null;
  jitterSeconds: number | null;
  contentVariants: string[] | null;
  socialAccount: { platformUsername: string };
  lastError: string | null;
  publishedAt: string | null;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Draft",      className: "bg-zinc-500/10 text-zinc-400" },
  APPROVED:  { label: "Disetujui", className: "bg-emerald-500/10 text-emerald-400" },
  SCHEDULED: { label: "Terjadwal", className: "bg-violet-500/10 text-violet-400" },
  PUBLISHED: { label: "Terbit",    className: "bg-blue-500/10 text-blue-400" },
  FAILED:    { label: "Gagal",     className: "bg-red-500/10 text-red-400" },
};

export default function SchedulerPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Filters - default to SCHEDULED for scheduler page
  const [statusFilter, setStatusFilter] = useState("SCHEDULED");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  const fetchPosts = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (platformFilter !== "ALL") params.set("platform", platformFilter);
    
    if (dateFilter) {
      params.set("date", dateFilter);
    } else if (monthFilter) {
      params.set("month", monthFilter);
      params.set("year", yearFilter);
    }

    fetch(`/api/posts?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat posts:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, platformFilter, dateFilter, monthFilter, yearFilter]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, platformFilter, dateFilter, monthFilter, yearFilter]);

  return (
    <div className="flex-1 overflow-auto bg-[#09090b]">
      <header className="border-b border-[#141416] px-7 py-4 sticky top-0 bg-[#09090b] z-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Scheduler</h1>
          <p className="text-xs text-zinc-600 mt-0.5">Total {total} post · Pantau antrean jadwal postingan Anda</p>
        </div>
      </header>

      <div className="p-7">
        {/* Filter Section */}
        <div className="bg-zinc-900/40 p-4 rounded-xl border border-[#27272a] mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Platform Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Platform</span>
              <select 
                className="input text-xs py-1.5 h-8 bg-zinc-900 border-zinc-800"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="ALL">Semua</option>
                <option value="X">X</option>
              </select>
            </div>
            
            <div className="w-px h-6 bg-zinc-800 hidden sm:block"></div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Status</span>
              <select 
                className="input text-xs py-1.5 h-8 bg-zinc-900 border-zinc-800"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Semua</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Disetujui</option>
                <option value="SCHEDULED">Terjadwal</option>
                <option value="PUBLISHED">Terbit</option>
                <option value="FAILED">Gagal</option>
              </select>
            </div>

            <div className="w-px h-6 bg-zinc-800 hidden sm:block"></div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Tanggal</span>
              <input 
                type="date" 
                className="input text-xs py-1.5 h-8 bg-zinc-900 border-zinc-800"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value) setMonthFilter(""); // clear month if exact date is picked
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Atau Bulan</span>
              <select 
                className="input text-xs py-1.5 h-8 bg-zinc-900 border-zinc-800"
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  if (e.target.value) setDateFilter(""); // clear date if month is picked
                }}
              >
                <option value="">Semua Bulan</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                ))}
              </select>
              
              {monthFilter && (
                <select 
                  className="input text-xs py-1.5 h-8 bg-zinc-900 border-zinc-800 w-20"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  {[0, 1, 2].map((offset) => {
                    const y = new Date().getFullYear() + offset;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3 font-medium w-48">Platform & Akun</th>
                  <th className="px-5 py-3 font-medium min-w-[300px] w-full">Konten</th>
                  <th className="px-5 py-3 font-medium w-32">Status</th>
                  <th className="px-5 py-3 font-medium w-64 text-right">Jadwal & Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-zinc-500 text-sm">
                      Memuat data...
                    </td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-3xl mb-3">🗓️</span>
                        <span className="font-semibold text-sm text-zinc-400">Queue kosong</span>
                        <span className="text-xs mt-1 max-w-[250px] leading-relaxed">
                          <a href="/ai-bank/generate" className="text-emerald-500 hover:underline">Generate konten</a> dan setujui untuk mulai menjadwalkan.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => {
                    const cfg = STATUS_STYLE[post.status] ?? { label: post.status, className: "bg-zinc-500/10 text-zinc-400" };
                    return (
                      <tr key={post.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className="badge bg-zinc-800 text-zinc-300 text-[10px] font-bold tracking-wider">
                              {post.platform}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-medium">@{post.socialAccount?.platformUsername}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top whitespace-normal">
                          <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
                            {post.content}
                          </p>
                          {post.lastError && (
                            <div className="mt-2 text-[11px] text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-md inline-block w-full">
                              <span className="font-semibold">Error:</span> {post.lastError}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={`badge text-[11px] font-medium whitespace-nowrap ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          <div className="flex flex-col gap-1 text-[11px] items-end justify-start">
                            {post.jitteredAt ? (
                              <>
                                <span className="text-zinc-300 font-medium">
                                  {new Date(post.jitteredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}
                                </span>
                                <span className="text-zinc-400">
                                  {new Date(post.jitteredAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                                </span>
                                {post.jitterSeconds && (
                                  <span className="text-emerald-500/80 mt-1 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block">
                                    +{post.jitterSeconds}s jitter
                                  </span>
                                )}
                              </>
                            ) : post.scheduledAt ? (
                              <span className="text-zinc-400">
                                {new Date(post.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}
                              </span>
                            ) : (
                              <span className="text-zinc-600 italic">Belum diatur</span>
                            )}
                            
                            {post.publishedAt && (
                              <span className="text-blue-400/90 font-medium mt-1 bg-blue-500/10 px-1.5 py-0.5 rounded inline-block">
                                Terbit: {new Date(post.publishedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {!loading && posts.length > 0 && (
            <div className="px-5 py-4 border-t border-zinc-800/50 bg-zinc-900/40 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-medium">
                Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="px-2.5 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded disabled:opacity-30 transition-colors"
                >
                  Prev
                </button>
                <div className="px-3 py-1.5 text-xs text-zinc-400 font-medium bg-zinc-900 rounded border border-zinc-800/50">
                  {page} / {totalPages}
                </div>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
