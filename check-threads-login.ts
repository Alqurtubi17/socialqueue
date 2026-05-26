import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "./lib/crypto";

const prisma = new PrismaClient();

async function run() {
  const account = await prisma.socialAccount.findFirst({ where: { platform: "THREADS" } });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const page = await context.newPage();
  const username = decrypt(account!.loginUsername);
  const password = decrypt(account!.loginPassword);

  console.log("Navigating to login...");
  await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log("Filling form...");
  await page.locator('input[placeholder*="Username"], input[type="text"]').fill(username);
  await page.waitForTimeout(1000);

  await page.locator('input[type="password"]').fill(password);
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "threads-before-login.png" });
  console.log("Clicking submit...");
  await page.locator('button[type="submit"], div[role="button"]:has-text("Log in"), div[role="button"]:has-text("Masuk")').first().click();

  console.log("Waiting for 10 seconds...");
  await page.waitForTimeout(10000);

  await page.screenshot({ path: "threads-after-login.png" });
  console.log("URL after login:", page.url());

  await browser.close();
  process.exit(0);
}

run().catch(console.error);
