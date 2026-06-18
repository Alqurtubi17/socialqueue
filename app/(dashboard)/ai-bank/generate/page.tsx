"use client";
// app/(dashboard)/ai-bank/generate/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TONES = [
  { value: "profesional", label: "Profesional" },
  { value: "santai", label: "Santai & Relatable" },
  { value: "inspiratif", label: "Inspiratif" },
  { value: "edukasi", label: "Edukatif" },
  { value: "komunitas", label: "Komunitas" },
];

const TEMPLATES = [
  {
    brandName: "solutionist",
    industry: "Jasa Olah Data Statistik & Riset",
    targetAudience: "Mahasiswa S1/S2/S3 dan peneliti yang sedang pusing mengerjakan olah data Bab 4",
    mainValueProp: "Jasa olah data statistik (SPSS/STATA/EViews/R) yang cepat, akurat, dan auto lolos uji lengkap dengan naskah interpretasi Bab 4",
    keyMessages: "Revisi dari dosen pembimbing bikin pusing? Kami bantu olah datanya sampai beres!\nTidak perlu stres memikirkan Uji Asumsi Klasik atau Regresi yang gagal terus\nHarga transparan, pengerjaan cepat, dan siap menghadapi sidang skripsi\nPembahasan hasil olah data disajikan dengan bahasa manusia yang mudah dipahami",
    tone: "santai",
  },
  {
    brandName: "solutionist",
    industry: "Konsultan Machine Learning & AI",
    targetAudience: "Pemilik bisnis, startup, dan mahasiswa IT yang membutuhkan prediksi, klasifikasi, atau clustering data",
    mainValueProp: "Membangun model Machine Learning yang presisi (Python/R) lengkap dengan source code, preprocessing, dan laporan evaluasi akurasi",
    keyMessages: "Otomatisasi keputusan bisnis Anda dengan model AI yang cerdas\nDari data mentah hingga prediksi masa depan yang akurat dengan Machine Learning\nSource code lengkap, rapi, dan kami jelaskan logikanya sampai paham\nTingkatkan efisiensi dan profit dengan algoritma berbasis data",
    tone: "profesional",
  },
  {
    brandName: "Konselo (by Solutionist)",
    industry: "Software Pendidikan & Bimbingan Konseling (EdTech)",
    targetAudience: "Kepala Sekolah, Guru BK, dan Institusi Pendidikan SMP/SMA",
    mainValueProp: "Aplikasi cerdas manajemen BK untuk pemetaan sosiogram siswa, deteksi perundungan (bullying), dan tracking poin kedisiplinan secara otomatis",
    keyMessages: "Tinggalkan buku catatan manual, saatnya digitalisasi sistem Bimbingan Konseling di sekolah Anda\nPantau dinamika sosial siswa dan cegah bullying sejak dini dengan fitur sosiogram interaktif\nKelola poin pelanggaran dan prestasi siswa secara terotomatisasi\nCiptakan lingkungan sekolah yang lebih aman, inklusif, dan terkendali berbasis data",
    tone: "edukasi",
  },
  {
    brandName: "solutionist",
    industry: "Konsultasi Publikasi Jurnal & Akademik",
    targetAudience: "Dosen, peneliti, dan mahasiswa S2/S3 yang mengejar publikasi jurnal SINTA/Scopus",
    mainValueProp: "Pendampingan penyusunan artikel ilmiah berstandar internasional mulai dari struktur, metodologi, hingga analisis data empiris",
    keyMessages: "Submit jurnal Scopus ditolak terus karena metodologi? Kami bantu perkuat analisis datanya\nFokus pada kebaruan penelitian, biarkan kami yang mengurus kerumitan uji statistiknya\nKonsultasi mendalam hingga manuskrip siap disubmit ke jurnal target\nDitangani oleh tim yang berpengalaman dalam publikasi akademik internasional",
    tone: "profesional",
  },
  {
    brandName: "solutionist",
    industry: "Business Intelligence & Data Visualization",
    targetAudience: "C-Level, Manajer, dan Pemilik Bisnis yang kesulitan membaca ribuan baris data Excel",
    mainValueProp: "Pembuatan dashboard interaktif (Tableau/Power BI) yang mengubah data mentah menjadi insight bisnis dalam hitungan detik",
    keyMessages: "Berhenti mengambil keputusan bisnis berdasarkan feeling, saatnya gunakan data!\nRibuan baris Excel disulap menjadi dashboard visual yang mudah dipahami siapa saja\nTracking KPI, sales, dan performa tim secara real-time dari satu layar\nInvestasi kecil untuk dashboard yang menyelamatkan perusahaan dari kerugian salah strategi",
    tone: "inspiratif",
  },
  {
    brandName: "solutionist",
    industry: "Web Scraping & Data Mining",
    targetAudience: "Perusahaan riset, startup, dan analis yang butuh dataset spesifik berskala besar dari internet",
    mainValueProp: "Jasa ekstraksi data otomatis dari website dan e-commerce dalam format bersih yang siap diolah (CSV/JSON/SQL)",
    keyMessages: "Butuh data harga kompetitor dari e-commerce? Kami scrape semuanya dalam semalam\nData yang kami kirim sudah bersih, rapi, dan bebas duplikasi\nMembantu riset pasar Anda dengan data aktual, bukan data sekunder tahun lalu\nLegal, aman, dan efisien untuk kebutuhan Big Data perusahaan Anda",
    tone: "profesional",
  },
  {
    brandName: "solutionist",
    industry: "NLP & Sentiment Analysis",
    targetAudience: "Brand manager, tim PR, dan agensi marketing yang ingin memonitor opini publik",
    mainValueProp: "Analisis sentimen berbasis AI (Natural Language Processing) untuk membaca persepsi netizen di media sosial secara otomatis",
    keyMessages: "Apa kata netizen tentang brand Anda hari ini? Positif, negatif, atau netral?\nCegah krisis PR sebelum membesar dengan monitoring sentimen secara real-time\nBukan cuma menghitung komentar, AI kami mengerti sarkasme dan konteks bahasa lokal\nLaporan analitik yang komprehensif untuk strategi marketing bulan depan",
    tone: "edukasi",
  },
  {
    brandName: "solutionist",
    industry: "Bootcamp & Mentoring Data Science",
    targetAudience: "Mahasiswa, fresh graduate, dan career switcher yang ingin jadi Data Analyst/Data Scientist",
    mainValueProp: "Mentoring intensif 1-on-1 belajar Python, SQL, dan Machine Learning langsung studi kasus real-world",
    keyMessages: "Belajar coding dari YouTube sering stuck? Mentoring 1-on-1 adalah jalan pintasmu!\nKami ajarkan hal yang benar-benar dipakai di industri, bukan cuma teori akademis\nBimbingan pembuatan portfolio data science yang bikin HRD langsung melirik\nDari nol sampai bisa deploy model Machine Learning sendiri",
    tone: "komunitas",
  },
  {
    brandName: "solutionist",
    industry: "Custom ERP & IT System Development",
    targetAudience: "UMKM menengah dan perusahaan yang sistem operasionalnya masih berantakan/manual",
    mainValueProp: "Pembuatan sistem IT kustom (Web/Mobile) yang mengintegrasikan keuangan, inventaris, dan HR dalam satu pintu",
    keyMessages: "Software instan tidak cocok dengan alur kerja Anda? Saatnya buat sistem custom!\nIntegrasi data antar divisi tanpa perlu copy-paste Excel yang rawan human error\nDibangun dengan arsitektur modern yang tahan banting meski data terus bertambah\nKeamanan data terjamin dan kami dampingi masa transisi sampai tim Anda terbiasa",
    tone: "profesional",
  },
  {
    brandName: "Konselo (by Solutionist)",
    industry: "Pelatihan IT untuk Guru",
    targetAudience: "Yayasan sekolah dan dewan guru yang ingin meningkatkan literasi digital",
    mainValueProp: "Workshop dan in-house training penggunaan AI dan software manajemen sekolah untuk mempermudah tugas guru",
    keyMessages: "Guru hebat adalah guru yang melek teknologi. Mari digitalisasi sistem administrasi!\nCara menggunakan AI untuk menyusun RPP dan bahan ajar dalam 5 menit\nMengurangi beban kerja administratif agar guru bisa fokus mengajar\nPelatihan santai, praktis, dan langsung bisa diterapkan di kelas besok pagi",
    tone: "edukasi",
  }
];

export default function GeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ batchId: string; totalGenerated: number } | null>(null);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [form, setForm] = useState({
    socialAccountId: "",
    platform: "X" as "X",
    brandName: "",
    industry: "",
    targetAudience: "",
    mainValueProp: "",
    keyMessages: "",
    tone: "profesional",
    days: 10, // Default turunkan ke 10 agar aman dari limit
    postsPerDay: 1,
    generateVariants: true,
  });

  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const dailyTemplate = TEMPLATES[dayOfYear % TEMPLATES.length];

    setForm(prev => ({
      ...prev,
      brandName: dailyTemplate.brandName,
      industry: dailyTemplate.industry,
      targetAudience: dailyTemplate.targetAudience,
      mainValueProp: dailyTemplate.mainValueProp,
      keyMessages: dailyTemplate.keyMessages,
      tone: dailyTemplate.tone
    }));

    async function fetchAccounts() {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts || []);
          if (data.accounts && data.accounts.length > 0) {
            setForm(prev => ({
              ...prev,
              socialAccountId: data.accounts[0].id,
              platform: data.accounts[0].platform
            }));
          }
        }
      } catch (err) {
        console.error("Gagal memuat akun:", err);
      } finally {
        setLoadingAccounts(false);
      }
    }
    fetchAccounts();
  }, []);

  function applyRandomTemplate() {
    const randomTemplate = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    setForm(prev => ({
      ...prev,
      brandName: randomTemplate.brandName,
      industry: randomTemplate.industry,
      targetAudience: randomTemplate.targetAudience,
      mainValueProp: randomTemplate.mainValueProp,
      keyMessages: randomTemplate.keyMessages,
      tone: randomTemplate.tone
    }));
  }

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.days * form.postsPerDay > 20) {
      setError("Untuk tier gratis, batas maksimal generate dalam satu waktu adalah 20 post. Harap kurangi jumlah hari atau post per hari.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(10);

    // Simulate progress while waiting for API
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85));
    }, 400);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialAccountId: form.socialAccountId,
          platform: form.platform,
          days: form.days,
          postsPerDay: form.postsPerDay,
          generateVariants: form.generateVariants,
          businessContext: {
            brandName: form.brandName,
            industry: form.industry,
            targetAudience: form.targetAudience,
            mainValueProp: form.mainValueProp,
            keyMessages: form.keyMessages.split("\n").filter(Boolean),
            tone: form.tone,
            maxCharacters: form.platform === "X" ? 280 : 500,
          },
        }),
      });

      const data = await res.json();
      clearInterval(interval);
      setProgress(100);

      if (!res.ok) throw new Error(data.error ?? "Generasi gagal.");
      setResult(data);
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="flex-1 flex items-center justify-center p-7">
        <div className="card p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5 text-2xl">✨</div>
          <h2 className="text-lg font-bold mb-2">Generasi Selesai!</h2>
          <p className="text-sm text-zinc-400 mb-1">
            <span className="text-white font-bold">{result.totalGenerated}</span> konten berhasil dibuat
          </p>
          <p className="text-xs text-zinc-600 mb-6">Batch ID: {result.batchId}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/ai-bank")}
              className="btn-primary flex-1 justify-center"
            >
              Lihat & Review Konten
            </button>
            <button
              onClick={() => { setResult(null); setProgress(0); }}
              className="btn-ghost flex-1 justify-center"
            >
              Generate Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <header className="border-b border-[#141416] px-7 py-4 sticky top-0 bg-[#09090b] z-10">
        <h1 className="text-lg font-bold tracking-tight">Generate Konten AI</h1>
        <p className="text-xs text-zinc-600 mt-0.5">AI akan menulis konten 30 hari dengan gaya copywriter profesional</p>
      </header>

      <div className="p-7 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform & Account */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Pilih Akun</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="section-label">Akun Sosial</label>
                {loadingAccounts ? (
                  <div className="input flex items-center text-zinc-500 animate-pulse">Memuat...</div>
                ) : accounts.length === 0 ? (
                  <div className="text-xs text-red-400 mt-2">Belum ada akun terhubung. Tambahkan di menu Akun Terhubung.</div>
                ) : (
                  <select
                    className="input"
                    value={form.socialAccountId}
                    onChange={(e) => {
                      const acc = accounts.find(a => a.id === e.target.value);
                      if (acc) {
                        setForm(prev => ({ ...prev, socialAccountId: e.target.value, platform: acc.platform as "X" }));
                      }
                    }}
                    required
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        @{acc.platformUsername} ({acc.platform})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="section-label">Platform Tujuan</label>
                <input
                  className="input opacity-60 bg-[#0c0c0e]/50 cursor-not-allowed"
                  value={"X (Twitter)"}
                  readOnly
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Brand Context */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Konteks Brand</h3>
              <button
                type="button"
                onClick={applyRandomTemplate}
                className="text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" /></svg>
                Ganti Template Acak
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="section-label">Nama Brand</label>
                <input className="input" placeholder="e.g. Toko Kopi Nusantara" value={form.brandName} onChange={(e) => update("brandName", e.target.value)} required />
              </div>
              <div>
                <label className="section-label">Industri / Niche</label>
                <input className="input" placeholder="e.g. kuliner, teknologi, fashion" value={form.industry} onChange={(e) => update("industry", e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="section-label">Target Audiens</label>
              <input className="input" placeholder="e.g. profesional muda 25-35 tahun di kota besar" value={form.targetAudience} onChange={(e) => update("targetAudience", e.target.value)} required />
            </div>
            <div>
              <label className="section-label">Proposisi Nilai Utama</label>
              <input className="input" placeholder="e.g. kopi specialty dengan harga terjangkau dan pengiriman cepat" value={form.mainValueProp} onChange={(e) => update("mainValueProp", e.target.value)} required />
            </div>
            <div>
              <label className="section-label">Pesan Kunci (satu per baris, maks 5)</label>
              <textarea
                className="input resize-none"
                rows={4}
                placeholder={"Kualitas premium tanpa kompromi\nPelayanan cepat dan responsif\nCommunity yang supportif"}
                value={form.keyMessages}
                onChange={(e) => update("keyMessages", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="section-label">Tone Konten</label>
              <div className="flex gap-2 flex-wrap">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update("tone", t.value)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.tone === t.value
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "border-[#27272a] text-zinc-500 hover:text-zinc-300"
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule Config */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Konfigurasi Jadwal</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="section-label">Jumlah Hari</label>
                <input type="number" className="input" min={1} max={20} value={form.days || ""} onChange={(e) => update("days", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="section-label">Post per Hari</label>
                <input type="number" className="input" min={1} max={3} value={form.postsPerDay || ""} onChange={(e) => update("postsPerDay", parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => update("generateVariants", !form.generateVariants)}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.generateVariants ? "bg-emerald-500" : "bg-zinc-700"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.generateVariants ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Generate Variasi Spintax</p>
                <p className="text-xs text-zinc-600">3 versi alternatif per post untuk menghindari deteksi konten duplikat</p>
              </div>
            </label>
          </div>

          {/* Info box */}
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-xs text-zinc-400 space-y-1.5 animate-fade-in">
            <p className="text-emerald-400 font-semibold mb-2">Yang akan AI lakukan:</p>
            {[
              `Menulis ${form.days * form.postsPerDay} post draft bilingual (Indonesia & Inggris), gaya organik`,
              "Menggunakan 10 jenis engagement hook secara bergantian",
              "Menyebarkan pesan kunci secara merata selama periode",
              form.generateVariants ? "Membuat 3 variasi spintax per post" : "Tanpa variasi spintax",
              "Semua disimpan sebagai DRAFT — kamu review sebelum dijadwalkan",
            ].map((item, i) => (
              <p key={item} className="flex items-start gap-2 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <span className="text-emerald-500 mt-0.5">✓</span>{item}
              </p>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              {error}
            </p>
          )}

          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>AI sedang menulis...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-[#18181b] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-60">
            {loading ? "Generating..." : `Generate ${form.days * form.postsPerDay} Post Sekarang`}
          </button>
        </form>
      </div>
    </div>
  );
}
