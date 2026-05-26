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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  useEffect(() => {
    // Ambil lebih banyak post karena sekarang ada promo otomatis
    fetch("/api/posts?limit=300")
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = posts.filter((p) => 
    (statusFilter === "ALL" || p.status === statusFilter) &&
    (platformFilter === "ALL" || p.platform === platformFilter)
  );

  async function approvePost(postId: string, scheduledAt: string) {
    setApprovingId(postId);
    const res = await fetch(`/api/posts/${postId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt }),
    });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, status: "SCHEDULED" } : p
        )
      );
    }
    setApprovingId(null);
  }

  async function approveAllDrafts() {
    const drafts = posts.filter((p) => p.status === "DRAFT" && p.scheduledAt && (platformFilter === "ALL" || p.platform === platformFilter));
    if (drafts.length === 0) return;
    
    setIsApprovingAll(true);
    for (const post of drafts) {
      try {
        const res = await fetch(`/api/posts/${post.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt: post.scheduledAt }),
        });
        if (res.ok) {
          setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: "SCHEDULED" } : p)));
        }
      } catch (err) {
        console.error("Gagal menyetujui:", err);
      }
    }
    setIsApprovingAll(false);
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

  return (
    <div className="flex-1 overflow-auto">
      <header className="border-b border-[#141416] px-7 py-4 sticky top-0 bg-[#09090b] z-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">AI Content Bank</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{posts.length} post · Review dan jadwalkan konten yang di-generate AI</p>
        </div>
        <a href="/ai-bank/generate" className="btn-primary text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Generate Batch Baru
        </a>
      </header>

      <div className="p-7">
        {/* Filter tabs */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Baris Filter */}
          <div className="flex gap-4 flex-wrap items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-[#27272a]">
            <div className="flex gap-4 flex-wrap items-center">
              {/* Platform Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Platform</span>
                {["ALL", "X"].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setPlatformFilter(plat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      platformFilter === plat
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {plat === "ALL" ? "Semua" : plat}
                  </button>
                ))}
              </div>
              
              <div className="w-px h-6 bg-zinc-800"></div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Status</span>
                {["ALL", "DRAFT", "APPROVED", "SCHEDULED", "PUBLISHED"].map((f) => {
                  const count = posts.filter(p => 
                    (f === "ALL" || p.status === f) && 
                    (platformFilter === "ALL" || p.platform === platformFilter)
                  ).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        statusFilter === f
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-transparent text-zinc-500 border-transparent hover:border-[#27272a] hover:text-zinc-300"
                      }`}
                    >
                      {f === "ALL" ? "Semua" : STATUS_STYLE[f]?.label ?? f}
                      <span className="ml-1.5 opacity-60 font-normal">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bulk Approve Action */}
            {posts.filter((p) => p.status === "DRAFT" && (platformFilter === "ALL" || p.platform === platformFilter)).length > 0 && (
              <button
                onClick={approveAllDrafts}
                disabled={isApprovingAll}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/25 rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
              >
              {isApprovingAll ? (
                <span>Menyetujui...</span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  Setujui Semua Draft
                </>
              )}
            </button>
            )}
          </div>
        </div>

        {/* Posts grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-600 text-sm">
            Memuat konten...
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-zinc-600">
            <p className="text-3xl mb-3">📭</p>
            <p className="font-semibold text-sm mb-1">Belum ada konten</p>
            <p className="text-xs">
              <a href="/ai-bank/generate" className="text-emerald-500 hover:underline">Generate batch baru</a> untuk memulai
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((post) => {
              const cfg = STATUS_STYLE[post.status] ?? { label: post.status, className: "bg-zinc-500/10 text-zinc-400" };
              return (
                <div key={post.id} className="card card-hover p-5 animate-fade-in">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Meta row */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="badge bg-zinc-500/10 text-zinc-300 text-[11px]">
                          {post.platform}
                        </span>
                        <span className={`badge text-[11px] ${cfg.className}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[11px] text-zinc-600">@{post.socialAccount?.platformUsername}</span>
                        {post.contentVariants && post.contentVariants.length > 0 && (
                          <span className="text-[11px] text-zinc-600">{post.contentVariants.length} variasi</span>
                        )}
                      </div>

                      {/* Content */}
                      {editingId === post.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            className="input w-full min-h-[100px] text-sm text-zinc-300"
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
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line line-clamp-4">
                          {post.content}
                        </p>
                      )}

                      {/* Schedule info */}
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-600">
                        {post.scheduledAt && (
                          <span>
                            📅 {new Date(post.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                          </span>
                        )}
                        {post.jitterSeconds && (
                          <span className="text-emerald-600">
                            ⚡ Jitter +{post.jitterSeconds}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {(post.status === "DRAFT" || post.status === "FAILED") && (
                        <>
                          {post.scheduledAt && (
                            <button
                              onClick={() => approvePost(post.id, post.scheduledAt!)}
                              disabled={approvingId === post.id}
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              {approvingId === post.id ? "..." : "✓ Setujui"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(post.id);
                              setEditContent(post.content);
                            }}
                            className="text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-1.5 text-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            Edit
                          </button>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
                          setPosts((prev) => prev.filter((p) => p.id !== post.id));
                        }}
                        className="text-zinc-600 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-lg px-3 py-1.5 text-xs transition-all"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
