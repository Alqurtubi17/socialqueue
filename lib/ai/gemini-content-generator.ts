// lib/ai/gemini-content-generator.ts
// AI Content Bank — Gemini API Integration
// Prompt engineering untuk konten Indonesia yang organik dan natural.

import { Platform } from "@/lib/types";
import { prisma } from "@/lib/prisma";

export interface BusinessContext {
  brandName: string;
  industry: string;
  targetAudience: string;
  mainValueProp: string;
  keyMessages: string[];
  tone: "profesional" | "santai" | "inspiratif" | "edukasi" | "komunitas";
  avoidWords?: string[];
  maxCharacters?: number;
}

export interface GenerationConfig {
  userId: string;
  socialAccountId: string;
  platform: Platform;
  businessContext: BusinessContext;
  days?: number;
  postsPerDay?: number;
  generateVariants?: boolean;
}

export interface GenerationResult {
  batchId: string;
  totalGenerated: number;
  tokensUsed?: number;
}

// ────────────────────────────────────────────────────────────
// SYSTEM PROMPT — Inti anti-AI detection
// ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: BusinessContext, platform: Platform): string {
  const platformRule =
    platform === "X"
      ? `Platform X (Twitter). Batas panjang teks untuk field "content" dan "variants" adalah MAKS ${ctx.maxCharacters ?? 280} KARAKTER. Langsung ke inti. Satu hook kuat di kalimat pertama.`
      : `Platform Threads. Batas panjang teks untuk field "content" dan "variants" adalah MAKS ${ctx.maxCharacters ?? 500} KARAKTER. Boleh lebih naratif dan personal. Gunakan emoji secukupnya.`;

  return `Kamu adalah copywriter senior spesialis konten media sosial Indonesia dengan 12 tahun pengalaman.

PENTING UNTUK JSON: 
Jika kamu ingin membuat baris baru/line break di dalam teks, kamu WAJIB menggunakan \\n. JANGAN PERNAH membuat enter/baris baru secara literal di dalam teks JSON! Semua tanda kutip ganda (") di dalam teks juga HARUS di-escape dengan \\".

KARAKTER PENULISANMU:
- Kamu menulis seperti manusia yang benar-benar peduli dengan audiensnya.
- Kamu TIDAK PERNAH menggunakan: "Tentu saja!", "Sebagai [peran]...", "Berikut adalah...", "Kesimpulannya...", "Poin penting:", "Perlu diingat bahwa...", atau frasa robotik lainnya.
- Kamu menulis Bahasa Indonesia baku sesuai EYD namun mengalir natural — bukan kaku buku teks, bukan lebay iklan.
- Kamu tidak pernah menyebutkan bahwa ini dibuat AI.
- Kamu tidak hiperbola. Kamu spesifik dan kredibel.

KONTEKS:
- Brand: ${ctx.brandName}
- Industri: ${ctx.industry}  
- Audiens: ${ctx.targetAudience}
- Nilai Utama: ${ctx.mainValueProp}
- Pesan Kunci: ${ctx.keyMessages.map((m, i) => `(${i + 1}) ${m}`).join(" | ")}
- Tone: ${ctx.tone}
${ctx.avoidWords?.length ? `- HINDARI KATA INI: ${ctx.avoidWords.join(", ")}` : ""}

${platformRule}

TEKNIK HOOK (gunakan bergantian, jangan semua jenis hook dalam satu batch dominan satu jenis):
1. Pertanyaan provokatif: mulai dengan pertanyaan yang membuat orang berhenti scroll
2. Statistik spesifik: angka nyata lebih dipercaya dari klaim umum
3. Pernyataan kontrarian: tantang asumsi umum
4. Micro-story: cerita pendek 1-2 kalimat yang relatable
5. Penegasan langsung: satu kalimat kuat tanpa basa-basi
6. Mitos vs Fakta: sanggah mitos yang beredar luas di industri terkait
7. Humor ringan / Meme-style: pendekatan santai, lucu, namun tetap membawa value
8. Tips Praktis / Hacks: berikan jalan pintas atau cara cepat yang belum banyak diketahui
9. A Day in Life / Behind The Scene: cerita proses di balik layar yang autentik
10. Analogical Hook: gunakan perbandingan unik untuk menjelaskan konsep kompleks

STRUKTUR VALUE:
- Berikan insight nyata sebelum minta perhatian
- CTA soft: ajak berdiskusi, bukan hard sell
- Variasikan panjang: tidak semua harus panjang

SUMBER FAKTA & OTORITAS (PENTING):
- Untuk membangun otoritas, sesekali gunakan fakta dunia nyata, tren industri terbaru, atau wawasan dari jurnal penelitian bergengsi (contoh: riset Harvard, jurnal IEEE, laporan McKinsey, publikasi BPS, dsb) yang relevan dengan industri/pesan kunci.
- Sampaikan fakta atau kutipan akademik tersebut secara natural sebagai insight berharga, jangan seperti sedang menulis makalah.
- Jadikan brand ini terlihat sebagai pakar sungguhan yang berbicara berdasarkan data dan riset nyata, bukan sekadar asbun.
- WAJIB HASHTAG: Di akhir setiap konten (baik konten utama maupun variasi spintax-nya), WAJIB sertakan 3-5 hashtag yang relevan, senada, atau mirip dengan: #zonauang #jokitugas #jokispss (kamu bisa kembangkan dengan variasi seperti #jokiskripsi, #tugasakhir, #cuan, dsb).
${ctx.brandName.toLowerCase().includes("solutionist") ? "- PENTING: Secara acak (sekitar 30% dari total post), sertakan link website https://solutionist-id.vercel.app atau https://solutionist-id.vercel.app/marketplace di akhir konten secara natural." : ""}`;
}

// ────────────────────────────────────────────────────────────
// GEMINI API CALLER
// ────────────────────────────────────────────────────────────

async function callGemini(
  system: string,
  user: string,
  temperature = 0.85,
  responseSchema?: any
): Promise<{ text: string; tokens?: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tidak dikonfigurasi.");

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              temperature,
              topP: 0.92,
              topK: 40,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              ...(responseSchema ? { responseSchema } : {}),
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
            ],
          }),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        if (res.status === 503 || res.status === 429) {
          throw new Error(`Gemini API overloaded/rate-limited (Status: ${res.status}): ${body}`);
        }
        throw new Error(`Gemini API error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      if (!candidate) throw new Error("Gemini tidak mengembalikan kandidat.");
      if (candidate.finishReason === "SAFETY") throw new Error("Konten diblokir filter keamanan Gemini.");

      const text = candidate.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini mengembalikan respons kosong.");

      return { text, tokens: data.usageMetadata?.totalTokenCount };
    } catch (err: any) {
      lastError = err;
      const message = err.message || "";
      if (attempt < maxRetries && (message.includes("503") || message.includes("429") || message.includes("overloaded") || message.includes("rate-limited") || message.includes("fetch failed"))) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`[Gemini API] Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms... Error: ${message.slice(0, 100)}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// ────────────────────────────────────────────────────────────
// MAIN GENERATOR
// ────────────────────────────────────────────────────────────

export async function generateContentBatch(
  config: GenerationConfig
): Promise<GenerationResult> {
  const {
    userId, socialAccountId, platform, businessContext,
    days = 30, postsPerDay = 1, generateVariants = true,
  } = config;

  // Verifikasi kepemilikan akun sosial secara internal (Defense-in-depth)
  const accountExists = await prisma.socialAccount.findFirst({
    where: { id: socialAccountId, userId }
  });
  if (!accountExists) {
    throw new Error("Social account tidak ditemukan atau tidak sah.");
  }

  const total = days * postsPerDay;
  const maxChars = businessContext.maxCharacters ?? (platform === "X" ? 280 : 500);

  const systemPrompt = buildSystemPrompt(businessContext, platform);

  const schema = {
    type: "OBJECT",
    properties: {
      posts: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            dayOffset: { type: "INTEGER" },
            topicCategory: { type: "STRING" },
            hookType: { type: "STRING" },
            content: { type: "STRING" },
            variants: { type: "ARRAY", items: { type: "STRING" } },
            charCount: { type: "INTEGER" },
          },
          required: ["dayOffset", "topicCategory", "hookType", "content"],
        },
      },
    },
    required: ["posts"],
  };

  const CHUNK_SIZE = 5;
  const numChunks = Math.ceil(total / CHUNK_SIZE);
  let allPosts: Array<{
    dayOffset: number;
    topicCategory: string;
    hookType: string;
    content: string;
    variants?: string[];
    charCount?: number;
  }> = [];
  let totalTokensUsed = 0;
  let firstPromptUsed = "";

  // Fetch recent posts to avoid duplication
  let existingContentList: string[] = [];
  try {
    const dbPosts = await prisma.post.findMany({
      where: { socialAccountId, platform },
      select: { content: true },
      orderBy: { createdAt: "desc" },
      take: 40
    });
    existingContentList = dbPosts.map(p => p.content);
  } catch (e) {
    console.warn("Gagal mengambil post lama untuk konteks anti-duplikasi", e);
  }

  for (let i = 0; i < numChunks; i++) {
    const currentChunkSize = Math.min(CHUNK_SIZE, total - i * CHUNK_SIZE);

    // Build anti-duplication string
    const recentContext = existingContentList
      .slice(0, 40)
      .map((c, idx) => `[${idx+1}] ${c.substring(0, 150)}...`)
      .join("\n");

    const userPrompt = `Buat ${currentChunkSize} konten media sosial.

WAJIB:
- Panjang string pada field "content" dan masing-masing item di "variants" < ${maxChars} karakter.
- Batasan karakter ini HANYA UNTUK TEKS KONTENNYA! Kamu WAJIB mencetak seluruh ${currentChunkSize} item post secara lengkap dalam JSON. JANGAN BERHENTI DI TENGAH JALAN!
- Tidak ada 2 post berturut-turut bertema sama
- Setiap pesan kunci terdistribusi merata
${generateVariants ? `- Setiap post punya 3 variasi alternatif (phrasing berbeda, pesan sama)` : ""}
- KONTEN BARU WAJIB UNIK. JANGAN MENGULANG TOPIK ATAU KALIMAT YANG MIRIP DENGAN KONTEN INI:
${recentContext ? recentContext : "Belum ada konten sebelumnya."}

FORMAT: Kembalikan HANYA JSON valid (tanpa markdown, tanpa penjelasan tambahan). Jangan potong JSON-nya.
Pastikan tidak ada karakter control (seperti enter/newline literal) di dalam nilai string. Gunakan \\n untuk baris baru.
{
  "posts": [
    {
      "dayOffset": 0,
      "topicCategory": "edukasi|promo|testimoni|storytelling|engagement|insight",
      "hookType": "pertanyaan|statistik|kontrarian|cerita|penegasan|mitos_fakta|humor|tips|bts|analogi",
      "content": "Isi konten utama...",
      ${generateVariants ? `"variants": ["Variasi 1...", "Variasi 2...", "Variasi 3..."],` : ""}
      "charCount": 245
    }
  ]
}`;

    if (i === 0) firstPromptUsed = userPrompt;

    let chunkSuccess = false;
    let lastChunkError: any = null;
    const MAX_CHUNK_RETRIES = 3;

    for (let retry = 1; retry <= MAX_CHUNK_RETRIES; retry++) {
      try {
        const geminiResult = await callGemini(systemPrompt, userPrompt, 0.85, schema);
        
        let cleanJson = geminiResult.text
          .replace(/^```json\s*/m, "")
          .replace(/^```\s*/m, "")
          .replace(/```\s*$/m, "")
          .trim();
        
        let parsed = JSON.parse(cleanJson);
        if (parsed.posts && Array.isArray(parsed.posts)) {
          allPosts.push(...parsed.posts);
          existingContentList.unshift(...parsed.posts.map((p: any) => p.content));
          if (geminiResult.tokens) totalTokensUsed += geminiResult.tokens;
          chunkSuccess = true;
          break; // Sukses, keluar dari loop retry
        } else {
          throw new Error("JSON tidak memiliki properti 'posts' berupa array.");
        }
      } catch (err: any) {
        lastChunkError = err;
        console.warn(`[Gemini API] Error pada chunk ${i+1}, percobaan ${retry}: ${err.message}`);
        // Tunggu sebentar sebelum mencoba generate ulang chunk ini
        if (retry < MAX_CHUNK_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (!chunkSuccess) {
      throw new Error(`Gagal generate & parse JSON dari Gemini setelah ${MAX_CHUNK_RETRIES} percobaan. Error terakhir: ${lastChunkError?.message}`);
    }
  }

  // Simpan batch ke DB
  const batch = await prisma.contentBatch.create({
    data: {
      userId,
      platform,
      topic: businessContext.mainValueProp,
      daysGenerated: days,
      totalPosts: allPosts.length,
      promptUsed: firstPromptUsed,
      temperature: 0.85,
    },
  });

  // Jam posting manusiawi di Indonesia
  const GOOD_HOURS = [7, 8, 9, 12, 13, 19, 20, 21];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Ambil semua tanggal yang sudah ada kontennya (Draft, Terjadwal, Approved)
  const existingPosts = await prisma.post.findMany({
    where: {
      socialAccountId,
      status: { in: ["DRAFT", "APPROVED", "SCHEDULED"] },
      scheduledAt: { gte: now }
    },
    select: { scheduledAt: true }
  });

  // Hitung jumlah post per tanggal
  const datePostCounts = new Map<string, number>();
  existingPosts.forEach((p) => {
    if (p.scheduledAt) {
      const d = new Date(p.scheduledAt);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      datePostCounts.set(dateKey, (datePostCounts.get(dateKey) || 0) + 1);
    }
  });

  // Cari slot tanggal kosong (maksimal 3 post per tanggal)
  const assignedDates: Date[] = [];
  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() + 1); // Mulai cari dari besok

  // Kita iterasi sebanyak jumlah post yang di-generate (allPosts.length)
  for (let i = 0; i < allPosts.length; i++) {
    // Terus maju ke hari berikutnya sampai menemukan tanggal yang isinya < 3 post
    while (true) {
      const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      const currentCount = datePostCounts.get(dateKey) || 0;
      
      if (currentCount < 3) {
        // Ditemukan slot kosong, tambahkan ke array
        assignedDates.push(new Date(checkDate));
        // Update jumlah agar post berikutnya tidak kelewatan batas
        datePostCounts.set(dateKey, currentCount + 1);
        break; 
      }
      // Jika sudah 3 post, geser ke besoknya
      checkDate.setDate(checkDate.getDate() + 1);
    }
  }

  await prisma.$transaction(
    allPosts.map((p, i) => {
      // Untuk menghindari jam bentrok, kita tentukan index slot hariannya (0, 1, atau 2)
      // berdasarkan jam tayang dari post yang sudah ada, tapi untuk kemudahan kita ambil
      // index jam berdasarkan total post yang sudah di-generate pada looping ini saja
      const hour = GOOD_HOURS[(i * 3) % GOOD_HOURS.length] ?? 9;

      // Ambil tanggal yang sudah dialokasikan untuk post ini
      const scheduledAt = new Date(assignedDates[i] || new Date());
      scheduledAt.setHours(hour, 0, 0, 0);

      return prisma.post.create({
        data: {
          userId,
          socialAccountId,
          batchId: batch.id,
          platform,
          status: "DRAFT",
          content: p.content,
          contentVariants: generateVariants ? (p.variants ?? []) : [],
          scheduledAt,
        },
      });
    })
  );

  return {
    batchId: batch.id,
    totalGenerated: allPosts.length,
    tokensUsed: totalTokensUsed,
  };
}

export async function regenerateSinglePost(
  postId: string,
  userId: string,
  instruction?: string
): Promise<string> {
  const post = await prisma.post.findFirstOrThrow({
    where: { id: postId, userId },
    include: { socialAccount: true },
  });

  const platform = post.platform;
  const maxChars = platform === "X" ? 280 : 500;

  const system = `Kamu adalah copywriter senior Indonesia. Buat konten media sosial yang natural dan tidak terlihat seperti buatan AI.`;
  const user = `Buat 1 konten ${platform} pengganti yang lebih baik dan engaging dari ini:
"${post.content}"
${instruction ? `\nInstruksi: ${instruction}` : ""}

Maks ${maxChars} karakter. Kembalikan HANYA JSON:
{"content": "...", "variants": ["var1", "var2", "var3"]}`;

  const schema = {
    type: "OBJECT",
    properties: {
      content: { type: "STRING" },
      variants: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["content"]
  };

  const result = await callGemini(system, user, 0.9, schema);
  const parsed = JSON.parse(
    result.text.replace(/```json\n?|```\n?/g, "").trim()
  );

  await prisma.post.update({
    where: { id: postId },
    data: {
      content: parsed.content,
      contentVariants: parsed.variants ?? [],
      status: "DRAFT",
    },
  });

  return parsed.content;
}
