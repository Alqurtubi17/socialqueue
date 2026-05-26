// lib/platforms/browser-manager.ts
// Mengelola Playwright browser instance, stealth mode,
// dan session cookies agar tidak perlu login ulang setiap saat.

import { chromium, Browser, BrowserContext, Cookie } from "playwright";
import { addExtra } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

// Patch chromium dengan stealth plugin untuk menghindari deteksi bot
const stealthChromium = addExtra(chromium);
stealthChromium.use(StealthPlugin());

// ── Singleton browser instance (digunakan bersama di seluruh worker)
let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  console.log("[Browser] Meluncurkan browser baru (stealth mode aktif)...");

  browserInstance = await stealthChromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1280,800",
      // Samaran sebagai user biasa
      "--disable-infobars",
      "--disable-extensions",
    ],
  });

  browserInstance.on("disconnected", () => {
    console.warn("[Browser] Browser terputus, akan diluncurkan ulang saat dibutuhkan.");
    browserInstance = null;
  });

  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// ────────────────────────────────────────────────────────────
// SESSION MANAGEMENT
// ────────────────────────────────────────────────────────────

/**
 * Membuat BrowserContext baru dengan cookies yang sudah tersimpan
 * dari sesi login sebelumnya (jika ada dan masih valid).
 */
export async function createContextWithSession(
  socialAccountId: string
): Promise<{ context: BrowserContext; isLoggedIn: boolean }> {
  const browser = await getBrowser();

  const account = await prisma.socialAccount.findUniqueOrThrow({
    where: { id: socialAccountId },
  });

  // User-agent yang terlihat seperti browser biasa
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    // Izin notifikasi ditolak agar tidak ada popup
    permissions: [],
  });

  // Muat cookies tersimpan jika ada dan belum kedaluwarsa
  if (
    account.sessionCookies &&
    account.sessionExpiresAt &&
    account.sessionExpiresAt > new Date()
  ) {
    try {
      const cookiesJson = decrypt(account.sessionCookies);
      const cookies: Cookie[] = JSON.parse(cookiesJson);
      await context.addCookies(cookies);
      console.log(
        `[Browser] ✅ Session cookies dimuat untuk akun ${account.platformUsername}`
      );
      return { context, isLoggedIn: true };
    } catch (err) {
      console.warn("[Browser] Gagal memuat cookies tersimpan:", err);
    }
  }

  return { context, isLoggedIn: false };
}

/**
 * Menyimpan cookies dari context aktif ke database setelah login berhasil.
 */
export async function saveSessionCookies(
  context: BrowserContext,
  socialAccountId: string
): Promise<void> {
  const cookies = await context.cookies();
  const cookiesJson = JSON.stringify(cookies);
  const encryptedCookies = encrypt(cookiesJson);

  // Session berlaku 29 hari (Twitter session biasanya 30 hari)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 29);

  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      sessionCookies: encryptedCookies,
      sessionExpiresAt: expiresAt,
      sessionValid: true,
    },
  });

  console.log(`[Browser] ✅ Session cookies disimpan untuk akun ${socialAccountId}`);
}

/**
 * Invalidasi session (misal setelah detect login gagal atau akun terkunci).
 */
export async function invalidateSession(socialAccountId: string): Promise<void> {
  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      sessionCookies: null,
      sessionExpiresAt: null,
      sessionValid: false,
    },
  });
  console.warn(`[Browser] Session diinvalidasi untuk akun ${socialAccountId}`);
}

/**
 * Delay acak yang menyerupai perilaku manusia saat mengetik/berinteraksi.
 */
export async function humanDelay(minMs = 800, maxMs = 2500): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Mengetik teks karakter per karakter dengan delay acak (seperti manusia).
 */
export async function humanType(
  page: import("playwright").Page,
  selector: string,
  text: string
): Promise<void> {
  await page.click(selector);
  await humanDelay(200, 500);
  for (const char of text) {
    await page.type(selector, char, {
      delay: Math.floor(Math.random() * 120) + 40, // 40-160ms per karakter
    });
  }
}
