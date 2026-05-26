import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "./lib/crypto";

const prisma = new PrismaClient();

async function run() {
  const account = await prisma.socialAccount.findFirst({ where: { platform: "THREADS" } });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(JSON.parse(decrypt(account!.sessionCookies!)));

  const page = await context.newPage();
  await page.goto("https://www.threads.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const loc = page.locator('text="Log in or sign up for Threads", text="Log in", text="Continue with Instagram", text="Lanjutkan dengan Instagram"').first();
  const isVis1 = await loc.isVisible();
  console.log("isVis1:", isVis1);

  const loc2 = page.locator(':has-text("Log in or sign up for Threads"), :has-text("Continue with Instagram")').first();
  const isVis2 = await loc2.isVisible();
  console.log("isVis2:", isVis2);

  const loc3 = page.locator('[data-pressable-container="true"]:has-text("Continue with Instagram")').first();
  const isVis3 = await loc3.isVisible();
  console.log("isVis3:", isVis3);

  const html = await page.content();
  console.log("HTML contains Log in or sign up:", html.includes("Log in or sign up for Threads"));

  await browser.close();
  process.exit(0);
}

run().catch(console.error);
