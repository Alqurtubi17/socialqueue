"use client";
// app/(dashboard)/accounts/page.tsx
import { useState, useEffect } from "react";

interface SocialAccount {
  id: string;
  platform: "X";
  platformUsername: string;
  sessionValid: boolean;
  sessionExpiresAt: string | null;
  isActive: boolean;
  totalPostCount: number;
  lastPostedAt: string | null;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "X", username: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => { setAccounts(d.accounts ?? []); setLoading(false); });
  }, []);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      setAccounts((prev) => [...prev, data.account]);
      setShowForm(false);
      setForm({ platform: "X", username: "", password: "" });
    } else {
      setFormError(data.error ?? "Gagal menambahkan akun.");
    }
    setSaving(false);
  }

  async function removeAccount(id: string) {
    if (!confirm("Hapus akun ini? Semua post yang dijadwalkan akan dibatalkan.")) return;
    await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  const [loggingInId, setLoggingInId] = useState<string | null>(null);
  const [loginResult, setLoginResult] = useState<{id: string, type: 'success' | 'error', message: string} | null>(null);

  async function loginAccount(id: string) {
    setLoggingInId(id);
    setLoginResult(null);
    try {
      const res = await fetch(`/api/accounts/${id}/login`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, sessionValid: true } : a)));
        setLoginResult({ id, type: 'success', message: "Login berhasil! Akun sekarang terhubung." });
      } else {
        setLoginResult({ id, type: 'error', message: data.error || "Login gagal" });
      }
    } catch (err) {
      setLoginResult({ id, type: 'error', message: "Terjadi kesalahan jaringan saat mencoba login." });
    }
    setLoggingInId(null);
  }

  return (
    <div className="flex-1 overflow-auto">
      <header className="border-b border-[#141416] px-7 py-4 sticky top-0 bg-[#09090b] z-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Akun Terhubung</h1>
          <p className="text-xs text-zinc-600 mt-0.5">Kelola akun X yang akan digunakan untuk posting</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Akun
        </button>
      </header>

      <div className="p-7">
        {/* Security notice */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 text-xs text-zinc-400 mb-6 flex items-start gap-3">
          <span className="text-amber-400 text-base mt-0.5">⚠️</span>
          <div>
            <p className="text-amber-400 font-semibold mb-1">Keamanan Kredensial</p>
            <p>Username dan password dienkripsi dengan AES-256-GCM sebelum disimpan ke database. Sistem hanya menyimpan session cookies setelah login berhasil — password tidak pernah diakses kembali untuk posting.</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-xs text-zinc-400 mb-6">
          <p className="text-emerald-400 font-semibold mb-2">Cara Kerja Otomasi Browser</p>
          <div className="space-y-1.5">
            {[
              "Login pertama kali menggunakan Playwright (browser headless + stealth mode)",
              "Setelah login berhasil, cookies sesi disimpan terenkripsi — berlaku 29 hari",
              "Posting berikutnya menggunakan cookies tersimpan, tanpa perlu login ulang",
              "Jika session kadaluwarsa, sistem login ulang otomatis menggunakan credentials tersimpan",
            ].map((item) => (
              <p key={item} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">→</span>{item}
              </p>
            ))}
          </div>
        </div>

        {/* Accounts list */}
        {loading ? (
          <p className="text-zinc-600 text-sm text-center py-10">Memuat akun...</p>
        ) : accounts.length === 0 ? (
          <div className="card p-10 text-center text-zinc-600">
            <p className="text-3xl mb-3">🔗</p>
            <p className="font-semibold text-sm mb-1">Belum ada akun terhubung</p>
            <p className="text-xs">Klik "Tambah Akun" untuk menghubungkan akun X</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="card card-hover p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#18181b] flex items-center justify-center">
                    {acc.platform === "X" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#e4e4e7">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="4"></circle>
                        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4.5 8.4"></path>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">@{acc.platformUsername}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-600">
                      <span>{acc.platform}</span>
                      <span>·</span>
                      <span>{acc.totalPostCount} post</span>
                      {acc.lastPostedAt && (
                        <>
                          <span>·</span>
                          <span>Terakhir: {new Date(acc.lastPostedAt).toLocaleDateString("id-ID")}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`badge text-xs ${acc.sessionValid ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                      <span className={`status-dot ${acc.sessionValid ? "bg-emerald-500 animate-pulse-slow" : "bg-amber-500"}`}/>
                      {acc.sessionValid ? "Terhubung" : "Belum Terhubung"}
                    </span>
                    
                    {!acc.sessionValid && (
                      <button
                        onClick={() => loginAccount(acc.id)}
                        disabled={loggingInId === acc.id}
                        className="text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 text-xs border border-transparent rounded-lg px-3 py-1 transition-all font-medium"
                      >
                        {loggingInId === acc.id ? "Menghubungkan..." : "Login Ulang"}
                      </button>
                    )}

                    <button
                      onClick={() => removeAccount(acc.id)}
                      className="text-zinc-600 hover:text-red-400 text-xs border border-transparent hover:border-red-500/20 rounded-lg px-2.5 py-1 transition-all"
                    >
                      Hapus
                    </button>
                  </div>
                  
                  {loginResult?.id === acc.id && (
                    <div className={`text-[11px] px-2 py-1 rounded-md ${loginResult.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {loginResult.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-base font-bold mb-5">Hubungkan Akun Baru</h2>
            <form onSubmit={addAccount} className="space-y-4">
              <div>
                <label className="section-label">Platform</label>
                <select className="input" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>
                  <option value="X">X (Twitter)</option>
                </select>
              </div>
              <div>
                <label className="section-label">Username / Email</label>
                <input className="input" placeholder={"Username X"} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required autoComplete="off"/>
              </div>
              <div>
                <label className="section-label">Password</label>
                <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required autoComplete="new-password"/>
              </div>
              <p className="text-xs text-zinc-600">
                Credentials dienkripsi AES-256 sebelum disimpan. Login otomatis dilakukan via browser headless (Playwright stealth).
              </p>
              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
                  {saving ? "Menyimpan..." : "Hubungkan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
