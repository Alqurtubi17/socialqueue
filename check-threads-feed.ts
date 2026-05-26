import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "./lib/crypto";

const prisma = new PrismaClient();

async function run() {
  const account = await prisma.socialAccount.findFirst({ where: { platform: "THREADS" } });
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  await context.addCookies(JSON.parse(decrypt(account!.sessionCookies!)));

  const page = await context.newPage();
  await page.goto("https://www.threads.net/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(5000);

  // Take a screenshot of the logged in feed
  await page.screenshot({ path: "threads-feed-real.png" });

  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("div[role='button'], a")).map(e => ({
      text: e.textContent?.trim(),
      html: e.innerHTML.substring(0, 100),
      className: e.className
    }));
  });
  
  require("fs").writeFileSync("threads-feed-buttons.json", JSON.stringify(btns, null, 2));

  await browser.close();
  process.exit(0);
}

run().catch(console.error);
