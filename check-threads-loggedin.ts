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
  await page.goto("https://www.threads.net/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000); // Wait for feed to load

  // Take a screenshot of the logged-in feed
  await page.screenshot({ path: "threads-loggedin.png", fullPage: true });

  // Dump the entire HTML for inspection
  const html = await page.content();
  require("fs").writeFileSync("threads-dom.html", html);

  await browser.close();
  process.exit(0);
}

run().catch(console.error);
