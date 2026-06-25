import { prisma } from "../lib/prisma";
import { generateDailyAutoPosts } from "../lib/ai/auto-generator";

async function run() {
  console.log("Restoring queue for 14 days...");
  const accounts = await prisma.socialAccount.findMany({ where: { autoGenerateEnabled: true } });
  if (accounts.length === 0) return console.log("No account found");

  for (const account of accounts) {
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      console.log(`Generating for ${d.toDateString()} (Account: ${account.platformUsername})`);
      try {
        await generateDailyAutoPosts(account.id, d);
        console.log("Success");
      } catch(e) {
        console.log("Error:", e);
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.log("Done!");
}

run();
