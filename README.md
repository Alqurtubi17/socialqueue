# SocialQueue — Social Media Scheduler

SaaS penjadwalan konten untuk X (Twitter) dan Threads berbasis Next.js + Playwright.  
Posting dilakukan via otomasi browser headless (stealth mode) — tanpa API resmi.

---

## Arsitektur Sistem

```
┌─────────────────────┐     ┌───────────────────────┐
│   Next.js App       │     │   Worker Mandiri      │
│   (Port 3000)       │     │   (worker/index.ts)   │
│                     │     │                       │
│  • Dashboard UI     │     │  • Poll DB per 60s    │
│  • API Routes       │     │  • Playwright stealth │
│  • Gemini AI        │────▶│  • Post ke X/Threads  │
│  • Auth (NextAuth)  │     │  • Update DB status   │
└─────────────────────┘     └───────────────────────┘
          │                           │
          └──────────────┬────────────┘
                         ▼
              ┌─────────────────────┐
              │  PostgreSQL (Neon)  │
              │  • posts            │
              │  • social_accounts  │
              │  • content_batches  │
              └─────────────────────┘
```

**Mengapa Playwright, bukan API resmi?**
- X API v2 Free tier: hanya **500 post/bulan**, sangat terbatas
- X Basic API: $100/bulan — mahal untuk personal
- Threads API: tersedia tapi butuh app review yang panjang
- Playwright dengan stealth mode: tidak ada rate limit artificial, gratis

---

## Tech Stack

| Komponen        | Teknologi                            |
|-----------------|--------------------------------------|
| Framework       | Next.js 14 (App Router)              |
| Styling         | Tailwind CSS (Midnight Emerald theme)|
| Database        | PostgreSQL via Neon.tech             |
| ORM             | Prisma                               |
| Auth            | NextAuth.js (Credentials provider)  |
| Browser Bot     | Playwright + playwright-extra stealth|
| AI Generation   | Google Gemini 1.5 Flash              |
| Encryption      | AES-256-GCM (Node.js crypto)         |

---

## Setup Awal

### 1. Clone & Install

```bash
git clone <repo>
cd socialqueue
npm install

# Install Playwright browsers (hanya Chromium yang dibutuhkan)
npx playwright install chromium
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Isi nilai berikut di `.env.local`:

```bash
# Database (Neon.tech)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Enkripsi
TOKEN_ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# Gemini AI
GEMINI_API_KEY="AIza..."

# Cron protection
CRON_SECRET="$(openssl rand -hex 32)"
```

### 3. Setup Database

```bash
npm run db:push      # Push schema ke Neon.tech
npm run db:generate  # Generate Prisma Client
```

### 4. Buat User Pertama

```bash
# Via Prisma Studio
npm run db:studio

# Atau via script Node.js:
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
bcrypt.hash('sihab801', 10).then(hash => 
  prisma.user.create({ data: { email: 'admin@solutionist.id', password: hash, name: 'Admin' } })
).then(u => { console.log('User dibuat:', u.id); prisma.\$disconnect(); });
"
```

### 5. Jalankan Aplikasi

```bash
# Terminal 1: Next.js web app
npm run dev

# Terminal 2: Worker Playwright (di terminal terpisah!)
npm run worker
```

---

## Deployment

### Web App (Vercel / Railway / VPS)

```bash
npm run build
npm run start
```

**Penting:** Playwright **tidak bisa** berjalan di Vercel (serverless). Deploy worker secara terpisah.

### Worker (Railway / Render / VPS)

Railway:
1. Buat service baru di Railway
2. Set root directory (jika monorepo)
3. Build command: `npm install && npx playwright install chromium --with-deps`
4. Start command: `npm run worker`
5. Salin semua env vars yang sama dengan web app

VPS dengan PM2:
```bash
npm install -g pm2
npx playwright install chromium --with-deps
pm2 start "npm run worker" --name socialqueue-worker
pm2 save
pm2 startup
```

---

## Alur Kerja Lengkap

```
1. Tambah Akun
   Dashboard → Akun Terhubung → Tambah Akun
   → Masukkan username/password X atau Threads
   → Tersimpan terenkripsi AES-256 di database

2. Generate Konten
   Dashboard → AI Content Bank → Generate Batch Baru
   → Isi konteks brand, tone, jumlah hari
   → Gemini 1.5 Flash menulis 30 post draft
   → Semua disimpan sebagai status DRAFT

3. Review & Setujui
   AI Content Bank → Review setiap post
   → Edit jika perlu
   → Klik "Setujui" → status berubah ke SCHEDULED
   → Jitter otomatis diterapkan (+1–15 menit dari jadwal ideal)

4. Worker Publish Otomatis
   Worker polling database setiap ~60 detik
   → Temukan post: status=SCHEDULED, jitteredAt ≤ sekarang
   → Buka browser Playwright (headless, stealth)
   → Login menggunakan session cookies tersimpan
   → Ketik konten (per karakter, delay acak)
   → Klik Post → Update DB: status=PUBLISHED
```

---

## Keamanan

| Aspek                  | Implementasi                                   |
|------------------------|------------------------------------------------|
| Password user          | bcrypt (salt rounds: 10)                       |
| Credentials akun sosial| AES-256-GCM encryption                         |
| Session cookies        | AES-256-GCM encryption, expire 29 hari        |
| Bot detection          | Playwright-extra stealth plugin                |
| Human typing           | Per-karakter delay 40–160ms                   |
| Jitter posting         | Gaussian distribution +1–15 menit             |
| Daily cap              | X: 12/hari, Threads: 18/hari                  |
| Min interval           | X: 15 menit, Threads: 10 menit                |
| API endpoints          | Auth via NextAuth JWT                          |
| Cron endpoint          | Bearer token (CRON_SECRET)                    |

---

## Struktur Folder

```
socialqueue/
├── app/
│   ├── (auth)/login/           ← Halaman login
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← Sidebar + auth guard
│   │   ├── dashboard/          ← Overview stats
│   │   ├── scheduler/          ← Antrian jadwal
│   │   ├── ai-bank/            ← Review konten AI
│   │   │   └── generate/       ← Form generate Gemini
│   │   └── accounts/           ← Kelola akun sosial
│   ├── api/
│   │   ├── auth/               ← NextAuth handler
│   │   ├── posts/              ← CRUD + approve
│   │   ├── ai/generate/        ← Trigger Gemini
│   │   ├── accounts/           ← CRUD social accounts
│   │   └── cron/               ← Endpoint cron (optional)
│   ├── layout.tsx
│   ├── globals.css             ← Midnight Emerald tokens
│   └── providers.tsx
├── components/
│   └── dashboard/
│       ├── Sidebar.tsx
│       └── PostQueue.tsx
├── lib/
│   ├── prisma.ts               ← Prisma singleton
│   ├── auth.ts                 ← NextAuth config
│   ├── crypto.ts               ← AES-256-GCM utils
│   ├── ai/
│   │   └── gemini-content-generator.ts
│   ├── platforms/
│   │   ├── browser-manager.ts  ← Playwright singleton + cookies
│   │   ├── x-automation.ts     ← Login & post ke X
│   │   └── threads-automation.ts ← Login & post ke Threads
│   └── scheduler/
│       └── queue-processor.ts  ← Jitter engine + queue logic
├── prisma/
│   └── schema.prisma
├── worker/
│   └── index.ts                ← Standalone polling worker
├── middleware.ts               ← Auth protection
├── next.config.js
├── tailwind.config.ts
└── .env.example
```
