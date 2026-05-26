"use client";
// app/(dashboard)/ai-bank/page.tsx
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
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Draft",      className: "bg-zinc-500/10 text-zinc-400" },
  APPROVED:  { label: "Disetujui", className: "bg-emerald-500/10 text-emerald-400" },
  SCHEDULED: { label: "Terjadwal", className: "bg-violet-500/10 text-violet-400" },
  PUBLISHED: { label: "Terbit",    className: "bg-blue-500/10 text-blue-400" },
  FAILED:    { label: "Gagal",     className: "bg-red-500/10 text-red-400" },
};

export default function AIBankPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isApprovingAll, setIsApprovingAll] = useState(false);

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

  async function approvePost(postId: string, scheduledAt: string) {
    setApprovingId(postId);
    const res = await fetch(`/api/posts/${postId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt }),
    });
    if (res.ok) {
      fetchPosts(); // Refresh data to get the updated status
    }
    setApprovingId(null);
  }

  async function approveAllDrafts() {
    const drafts = posts.filter((p) => p.status === "DRAFT" && p.scheduledAt);
    if (drafts.length === 0) return;
    
    setIsApprovingAll(true);
    let successCount = 0;
    
    for (const post of drafts) {
      try {
        const res = await fetch(`/api/posts/${post.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt: post.scheduledAt }),
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Gagal menyetujui post:", post.id, err);
      }
    }
    
    setIsApprovingAll(false);
    if (successCount > 0) fetchPosts();
  }

  async function saveEdit(postId: string) {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, content: editContent } : p)));
        setEditingId(null);
      }
    } catch (err) {
      console.error("Gagal menyimpan edit:", err);
    }
  }

  async function deletePost(postId: string) {
    if (!confirm("Hapus konten ini?")) return;
    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    fetchPosts();
  }

  return (
    <div className="flex-1 overflow-auto bg-[#09090b]">
      <header className="border-b border-[#141416] px-7 py-4 sticky top-0 bg-[#09090b] z-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">AI Content Bank</h1>
          <p className="text-xs text-zinc-600 mt-0.5">Total {total} post · Review dan jadwalkan konten yang di-generate AI</p>
        </div>
        <a href="/ai-bank/generate" className="btn-primary text-sm flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Generate Batch Baru
        </a>
      </header>

      <div className="p-7">
        {/* Filter Section */}
        <div className="bg-zinc-900/40 p-4 rounded-xl border border-[#27272a] mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
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

            {/* Bulk Actions */}
            {posts.some((p) => p.status === "DRAFT") && (
              <button
                onClick={approveAllDrafts}
                disabled={isApprovingAll}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/25 rounded-lg px-4 py-1.5 h-8 text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2 ml-auto"
              >
              {isApprovingAll ? (
                <span>Menyetujui...</span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  Setujui Draft di Halaman Ini
                </>
              )}
            </button>
            )}
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
                  <th className="px-5 py-3 font-medium w-48">Jadwal</th>
                  <th className="px-5 py-3 font-medium text-right w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-zinc-500 text-sm">
                      Memuat data...
                    </td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-3xl mb-2">📭</span>
                        <span className="font-medium text-sm text-zinc-400">Tidak ada konten ditemukan</span>
                        <span className="text-xs mt-1">Coba sesuaikan filter Anda.</span>
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
                            {post.contentVariants && post.contentVariants.length > 0 && (
                              <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{post.contentVariants.length} variasi</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top whitespace-normal">
                          {editingId === post.id ? (
                            <div className="space-y-2">
                              <textarea
                                className="input w-full min-h-[100px] text-sm text-zinc-200"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit(post.id)}
                                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                                >
                                  Simpan
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-zinc-500 hover:text-zinc-300 px-3 py-1.5 text-xs transition-colors"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
                              {post.content}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={`badge text-[11px] font-medium whitespace-nowrap ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-1 text-[11px]">
                            {post.scheduledAt ? (
                              <>
                                <span className="text-zinc-300">
                                  {new Date(post.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}
                                </span>
                                <span className="text-zinc-500">
                                  {new Date(post.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                                </span>
                              </>
                            ) : (
                              <span className="text-zinc-600 italic">Belum diatur</span>
                            )}
                            {post.jitterSeconds && (
                              <span className="text-emerald-500/80 mt-1 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block w-fit">
                                +{post.jitterSeconds}s jitter
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          <div className="flex flex-col gap-1.5 items-end justify-start opacity-100 sm:opacity-40 sm:group-hover:opacity-100 transition-opacity">
                            {(post.status === "DRAFT" || post.status === "FAILED") && (
                              <>
                                {post.scheduledAt && (
                                  <button
                                    onClick={() => approvePost(post.id, post.scheduledAt!)}
                                    disabled={approvingId === post.id}
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded px-2.5 py-1 text-[11px] font-semibold transition-all w-20 text-center"
                                  >
                                    {approvingId === post.id ? "..." : "Setujui"}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingId(post.id);
                                    setEditContent(post.content);
                                  }}
                                  className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded px-2.5 py-1 text-[11px] transition-all w-20 text-center"
                                >
                                  Edit
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deletePost(post.id)}
                              className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded px-2.5 py-1 text-[11px] transition-all w-20 text-center"
                            >
                              Hapus
                            </button>
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
