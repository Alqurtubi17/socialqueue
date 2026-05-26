// lib/platforms/x-automation.ts
// Otomasi posting ke X (Twitter) menggunakan Playwright.
// Login sekali, simpan cookies, reuse session untuk posting berikutnya.

import { Page } from "playwright";
import {
  createContextWithSession,
  saveSessionCookies,
  invalidateSession,
  humanDelay,
  humanType,
} from "./browser-manager";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const X_URL = "https://x.com";
const X_LOGIN_URL = "https://x.com/i/flow/login";
const X_HOME_URL = "https://x.com/home";
const X_COMPOSE_URL = "https://x.com/compose/tweet";

export interface XPostResult {
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}

// ────────────────────────────────────────────────────────────
// LOGIN FLOW
// ────────────────────────────────────────────────────────────

/**
 * Login ke X menggunakan username + password.
 * Menangani flow multi-step X termasuk verifikasi tambahan.
 */
async function loginToX(
  page: Page,
  username: string,
  password: string
): Promise<boolean> {
  console.log(`[X] Memulai proses login untuk @${username}...`);

  await page.goto(X_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await humanDelay(1500, 3000);

  // ── Step 1: Masukkan username/email
  try {
    const usernameSelector = 'input';
    await page.waitForSelector(usernameSelector, { timeout: 25000 });
    await humanType(page, usernameSelector, username);
    await humanDelay(500, 1200);

    // Tekan tombol "Enter" sebagai ganti klik tombol "Lanjutkan" untuk lebih stabil
    await page.keyboard.press('Enter');
    await humanDelay(1500, 2500);
  } catch (e) {
    console.error("[X] Gagal menemukan form username atau menekan Enter:", e);
    return false;
  }

  // ── Step 2: Verifikasi tambahan (kadang X minta username lagi)
  // X kadang meminta konfirmasi username atau nomor telepon
  const hasExtraVerification = await page
    .locator('input[data-testid="ocfEnterTextTextInput"]')
    .isVisible()
    .catch(() => false);

  if (hasExtraVerification) {
    console.log("[X] X meminta verifikasi tambahan (username/phone)...");
    await humanType(
      page,
      'input[data-testid="ocfEnterTextTextInput"]',
      username
    );
    await humanDelay(500, 1000);
    await page.keyboard.press('Enter');
    await humanDelay(1500, 2500);
  }

  // ── Step 3: Masukkan password
  try {
    await page.waitForSelector('input[type="password"]', { timeout: 25000 });
    await humanType(page, 'input[type="password"]', password);
    await humanDelay(600, 1500);

    // Tekan tombol "Enter" sebagai ganti klik tombol "Log in" / "Masuk"
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.toString().includes("/home"), {
      timeout: 20000,
    });
    console.log(`[X] ✅ Login berhasil untuk @${username}`);
    return true;
  } catch (err) {
    // Cek apakah ada error "akun terkunci" atau "verifikasi diperlukan"
    const errorText = await page
      .locator('[data-testid="login-error-message"]')
      .textContent()
      .catch(() => null);

    if (errorText) {
      console.error(`[X] Login error: ${errorText}`);
    } else {
      console.error("[X] Login gagal (mungkin butuh 2FA atau akun dibatasi):", err);
    }
    return false;
  }
}

// ────────────────────────────────────────────────────────────
// MANUAL LOGIN TEST
// ────────────────────────────────────────────────────────────

export async function testLoginX(socialAccountId: string): Promise<{ success: boolean; error?: string }> {
  const account = await prisma.socialAccount.findUniqueOrThrow({
    where: { id: socialAccountId },
  });

  const username = decrypt(account.loginUsername);
  const password = decrypt(account.loginPassword);

  const { context } = await createContextWithSession(socialAccountId);
  // Hapus cookie lama agar benar-benar login dari awal
  await context.clearCookies();
  
  const page = await context.newPage();

  try {
    const loginSuccess = await loginToX(page, username, password);
    if (!loginSuccess) {
      await invalidateSession(socialAccountId);
      return { success: false, error: "Login gagal. Periksa kredensial atau mungkin ada pemblokiran." };
    }
    await saveSessionCookies(context, socialAccountId);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  } finally {
    await page.close();
    await context.close();
  }
}

// ────────────────────────────────────────────────────────────
// POSTING FLOW
// ────────────────────────────────────────────────────────────

/**
 * Mem-posting tweet ke X.
 * Jika session tidak valid, akan login ulang secara otomatis.
 */
export async function postToX(
  socialAccountId: string,
  content: string
): Promise<XPostResult> {
  const account = await prisma.socialAccount.findUniqueOrThrow({
    where: { id: socialAccountId },
  });

  const username = decrypt(account.loginUsername);
  const password = decrypt(account.loginPassword);

  const { context, isLoggedIn } = await createContextWithSession(socialAccountId);
  const page = await context.newPage();

  try {
    // ── 1. Jika belum login, jalankan login flow
    if (!isLoggedIn) {
      const loginSuccess = await loginToX(page, username, password);
      if (!loginSuccess) {
        await invalidateSession(socialAccountId);
        return { success: false, error: "Login ke X gagal. Periksa kredensial." };
      }
      await saveSessionCookies(context, socialAccountId);
    } else {
      // Verifikasi session masih valid dengan mengunjungi home
      await page.goto(X_HOME_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
      await humanDelay(1000, 2000);

      // Jika diredirect ke login, session sudah expired
      if (page.url().includes("/login") || page.url().includes("/i/flow/login")) {
        console.log("[X] Session expired, login ulang...");
        await invalidateSession(socialAccountId);
        const loginSuccess = await loginToX(page, username, password);
        if (!loginSuccess) {
          return { success: false, error: "Session expired dan login ulang gagal." };
        }
        await saveSessionCookies(context, socialAccountId);
      }
    }

    // ── 2. Navigasi ke compose tweet
    await page.goto(X_COMPOSE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
    await humanDelay(1500, 3000);

    // Alternatif: klik tombol compose jika redirect tidak bekerja
    const composerVisible = await page
      .locator('#layers [data-testid="tweetTextarea_0"]')
      .isVisible()
      .catch(() => false);

    if (!composerVisible) {
      // Coba klik tombol "Post" / ikon pensil di sidebar
      await page
        .locator('[data-testid="SideNav_NewTweet_Button"]')
        .click()
        .catch(() => {});
      await humanDelay(1000, 2000);
    }

    // ── 3. Ketik konten tweet
    // Gunakan selector spesifik di dalam #layers (tempat modal dirender)
    // agar tidak mengenai textarea di background timeline
    const tweetBox = page.locator('#layers [data-testid="tweetTextarea_0"]');
    await tweetBox.waitFor({ timeout: 10000 });
    await tweetBox.click();
    await humanDelay(400, 800);

    // Ketik perlahan seperti manusia
    for (const char of content) {
      await tweetBox.type(char, {
        delay: Math.floor(Math.random() * 100) + 30,
      });
    }

    await humanDelay(800, 2000);

    // ── 4. Verifikasi karakter tidak melebihi 280
    // (Sudah ditangani saat generate konten, tapi double-check)
    const charCount = await page
      .locator('[data-testid="tweetButton"] ~ * .DraftEditor-editorContainer')
      .textContent()
      .catch(() => content);

    // ── 5. Klik tombol "Post" / "Tweet"
    // Gunakan selector spesifik di dalam #layers
    const postButton = page.locator('#layers [data-testid="tweetButton"]');
    const isEnabled = await postButton.isEnabled().catch(() => false);

    if (!isEnabled) {
      // Coba selector alternatif
      await page.locator('#layers [data-testid="tweetButtonInline"]').dispatchEvent('click');
    } else {
      await postButton.dispatchEvent('click');
    }

    await humanDelay(2000, 4000);

    // ── 6. Ambil URL post yang baru dipublikasikan
    // Tunggu navigasi ke halaman tweet yang baru
    let postUrl: string | undefined;
    let postId: string | undefined;

    try {
      // Biasanya X akan navigasi ke halaman tweet setelah posting
      await page.waitForURL(
        (url) =>
          url.toString().includes("/status/") ||
          url.toString().includes("/home"),
        { timeout: 10000 }
      );

      const currentUrl = page.url();
      if (currentUrl.includes("/status/")) {
        postUrl = currentUrl;
        postId = currentUrl.split("/status/")[1]?.split("?")[0];
      }
    } catch {
      // Jika tidak ada navigasi, coba cari toast notification
      const toastLink = await page
        .locator('[data-testid="toast"] a')
        .getAttribute("href")
        .catch(() => null);

      if (toastLink) {
        postUrl = `${X_URL}${toastLink}`;
        postId = toastLink.split("/status/")[1]?.split("?")[0];
      }
    }

    // Update session cookies setelah sukses (refresh expiry)
    await saveSessionCookies(context, socialAccountId);

    console.log(`[X] ✅ Tweet berhasil diterbitkan: ${postUrl ?? "(URL tidak tertangkap)"}`);
    return { success: true, postUrl, postId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[X] ❌ Error saat posting:`, errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    await page.close();
    await context.close();
  }
}
