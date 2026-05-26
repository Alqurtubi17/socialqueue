import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.threads.net/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, div[role='button']")).map(e => ({
      text: e.textContent?.trim(),
      type: e.getAttribute("type")
    }));
  });
  console.log("BUTTONS:", btns);

  await browser.close();
  process.exit(0);
}

run().catch(console.error);
