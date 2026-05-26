import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "./lib/crypto";

const prisma = new PrismaClient();

async function run() {
  const account = await prisma.socialAccount.findFirst({ where: { platform: "THREADS" } });
  if (!account || !account.sessionCookies) {
    console.log("No Threads account with session found.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(JSON.parse(decrypt(account.sessionCookies)));

  const page = await context.newPage();
  await page.goto("https://www.threads.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  console.log("URL:", page.url());

  // Print text content of the page
  const text = await page.evaluate(() => document.body.innerText);
  console.log("TEXT ON PAGE:\n", text.substring(0, 500));

  // Find all buttons or roles
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="button"], button, a')).map(el => ({
      tag: el.tagName,
      role: el.getAttribute("role"),
      text: el.textContent?.trim(),
      ariaLabel: el.getAttribute("aria-label"),
      href: el.getAttribute("href")
    })).filter(b => b.text || b.ariaLabel);
  });

  console.log("BUTTONS:\n", JSON.stringify(buttons.slice(0, 20), null, 2));

  await browser.close();
  await prisma.$disconnect();
}

run().catch(console.error);
