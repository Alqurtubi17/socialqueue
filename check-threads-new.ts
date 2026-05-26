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
  await page.waitForTimeout(3000);

  // Fallback to /new
  await page.goto("https://www.threads.com/new", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Find Textareas
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[contenteditable="true"], textarea, [role="textbox"]')).map(el => ({
      tag: el.tagName,
      role: el.getAttribute("role"),
      contentEditable: el.getAttribute("contenteditable"),
      ariaLabel: el.getAttribute("aria-label"),
      text: el.textContent?.trim()
    }));
  });

  console.log("INPUTS AT /NEW:\n", JSON.stringify(inputs, null, 2));

  await browser.close();
  process.exit(0);
}

run().catch(console.error);
