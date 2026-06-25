import { prisma } from "@/lib/prisma";
import { BusinessContext } from "./gemini-content-generator";

// Helper function to call Gemini directly, similar to callGemini in gemini-content-generator
async function callGeminiRaw(
  system: string,
  user: string,
  schema?: any
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tidak dikonfigurasi.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: "application/json",
          ...(schema ? { responseSchema: schema } : {}),
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini empty response.");
  return text;
}

export async function generateDailyAutoPosts(socialAccountId: string) {
  // 1. Fetch account & context
  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
  });

  if (!account || !account.autoGenerateEnabled || !account.autoGenerateContext) {
    throw new Error("Akun tidak valid atau auto-generate tidak aktif.");
  }

  const ctx = account.autoGenerateContext as any as BusinessContext;
  const platform = account.platform;
  const maxChars = platform === "X" ? 280 : 500;

  // 2. Fetch existing recent contents to avoid duplicate
  const recentPosts = await prisma.post.findMany({
    where: { socialAccountId, platform },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { content: true }
  });
  const recentContext = recentPosts.map((p, idx) => `[${idx+1}] ${p.content.substring(0, 100)}...`).join("\n");

  const system = `Kamu adalah copywriter senior spesialis sosial media. Buat konten natural, anti-AI detection.
Konteks:
- Brand: ${ctx.brandName}
- Industri: ${ctx.industry}
- Audiens: ${ctx.targetAudience}
- Value Prop: ${ctx.mainValueProp}
- Pesan: ${ctx.keyMessages?.join(", ")}
- Tone: ${ctx.tone}`;

  const user = `Buat 2 konten media sosial pendek untuk ${platform} (maks ${maxChars} karakter tiap konten/variasi).
- Gunakan bahasa selang-seling (Indonesia dan Inggris bergantian).
- WAJIB buat konten yang sangat natural, sertakan pertanyaan/hook/fakta.
- WAJIB buat 2-3 hashtag spesifik dan viral di setiap post.
- JANGAN mengulang topik berikut:
${recentContext || "Belum ada konten."}

Kembalikan HANYA JSON:
{
  "posts": [
    {
      "content": "Isi utama...",
      "variants": ["Variasi 1...", "Variasi 2..."]
    }
  ]
}`;

  const schema = {
    type: "OBJECT",
    properties: {
      posts: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            content: { type: "STRING" },
            variants: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["content"]
        }
      }
    },
    required: ["posts"]
  };

  const resText = await callGeminiRaw(system, user, schema);
  let parsed: any;
  try {
    parsed = JSON.parse(resText.replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim());
  } catch (e) {
    throw new Error("Gagal parse JSON dari Gemini.");
  }

  if (!parsed.posts || !Array.isArray(parsed.posts) || parsed.posts.length === 0) {
    throw new Error("Format JSON posts tidak valid.");
  }

  // --- Tambahkan Promo Post (wajib 1 per hari) ---
  const promoTemplates = [
    "hewoooo! solutionist open yaaa. ayo yg mau olah data/tutor masih ada beberapa slot nihhh #zonauang #jokitugas",
    "haloo! solutionist open yaa. ayo yang mau konsultasi skripsi (kuantitatif), olah data (spss, eviews, stata, smartpls, dll), analisis data, coding, web, ML, NLP, data mining langsung hit me up yaa di WA dijamin satset dan trusted #zonauang #jokitugas #jokispss"
  ];
  const selectedPromo = promoTemplates[Math.floor(Math.random() * promoTemplates.length)];
  
  // Ambil maksimal 2 konten organik dari Gemini
  parsed.posts = parsed.posts.slice(0, 2);

  // Sisipkan promo post di urutan random
  const promoIndex = Math.floor(Math.random() * (parsed.posts.length + 1));
  parsed.posts.splice(promoIndex, 0, {
    content: selectedPromo,
    variants: [selectedPromo]
  });

  // 3. Schedule them throughout today (e.g., between 8 AM and 10 PM)
  const now = new Date();
  const startHour = 8;
  const endHour = 22;
  const postsCount = parsed.posts.length; // ideally 3
  const intervalMinutes = ((endHour - startHour) * 60) / postsCount;

  const dataToInsert = parsed.posts.map((post: any, index: number) => {
    const scheduledAt = new Date(now);
    scheduledAt.setHours(startHour, 0, 0, 0);
    scheduledAt.setMinutes(scheduledAt.getMinutes() + (index * intervalMinutes));
    
    // Jika waktu yang dijadwalkan sudah lewat hari ini, tambahkan beberapa menit dari sekarang
    if (scheduledAt < now) {
       scheduledAt.setTime(now.getTime() + (Math.random() * 30 * 60000));
    }

    return {
      userId: account.userId,
      socialAccountId: account.id,
      platform,
      status: "SCHEDULED",
      content: post.content,
      contentVariants: post.variants || [],
      scheduledAt,
      jitteredAt: scheduledAt,
      jitterSeconds: 0,
    };
  });

  await prisma.post.createMany({
    data: dataToInsert
  });

  return { success: true, count: dataToInsert.length };
}


export async function updateWeeklyTemplate(socialAccountId: string) {
  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
  });

  if (!account || !account.autoGenerateEnabled || !account.autoGenerateContext) {
    throw new Error("Akun tidak valid atau auto-generate tidak aktif.");
  }

  const ctx = account.autoGenerateContext as any as BusinessContext;

  const system = `Kamu adalah pakar strategi konten digital.`;
  const user = `Konteks brand saat ini:
- Brand: ${ctx.brandName}
- Industri: ${ctx.industry}
- Pesan Utama: ${ctx.keyMessages?.join(", ")}

Tugas: Buat 3-4 pesan utama (keyMessages) BARU yang segar untuk minggu ini, tanpa mengubah identitas brand. Gali dari sudut pandang lain (contoh: mitos industri, studi kasus, tips tidak biasa, cerita di balik layar).

Kembalikan HANYA JSON:
{
  "newKeyMessages": ["Pesan 1...", "Pesan 2...", "Pesan 3..."]
}`;

  const schema = {
    type: "OBJECT",
    properties: {
      newKeyMessages: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["newKeyMessages"]
  };

  const resText = await callGeminiRaw(system, user, schema);
  let parsed: any;
  try {
    parsed = JSON.parse(resText.replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim());
  } catch (e) {
    throw new Error("Gagal parse JSON dari Gemini.");
  }

  if (parsed.newKeyMessages && Array.isArray(parsed.newKeyMessages)) {
    ctx.keyMessages = parsed.newKeyMessages;
    
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        autoGenerateContext: ctx as any,
      }
    });

    return { success: true, newMessages: ctx.keyMessages };
  }

  throw new Error("Gagal generate pesan baru.");
}
