import { prisma } from "../lib/prisma";

const promoTemplates = [
  "hewoooo! solutionist open yaaa. ayo yg mau olah data/tutor masih ada beberapa slot nihhh #zonauang #jokitugas",
  "haloo! solutionist open yaa. ayo yang mau konsultasi skripsi (kuantitatif), olah data (spss, eviews, stata, smartpls, dll), analisis data, coding, web, ML, NLP, data mining langsung hit me up yaa di WA dijamin satset dan trusted #zonauang #jokitugas #jokispss"
];

async function run() {
  console.log("Scheduling promos until Dec 31, 2028...");
  const accounts = await prisma.socialAccount.findMany({ where: { autoGenerateEnabled: true } });
  
  if (accounts.length === 0) {
    console.log("No active auto-generate accounts found");
    return;
  }

  // Define start date (tomorrow) and end date (Dec 31, 2028)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start tomorrow
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date("2028-12-31T00:00:00Z");

  for (const account of accounts) {
    console.log(`Processing account: ${account.platformUsername}`);
    let currentDate = new Date(startDate);
    const dataToInsert: any[] = [];

    while (currentDate <= endDate) {
      // Pick random promo
      const selectedPromo = promoTemplates[Math.floor(Math.random() * promoTemplates.length)];
      
      // Random hour between 8 AM and 10 PM
      const hour = Math.floor(Math.random() * (22 - 8 + 1)) + 8;
      const minute = Math.floor(Math.random() * 60);
      
      const scheduledAt = new Date(currentDate);
      scheduledAt.setHours(hour, minute, 0, 0);

      dataToInsert.push({
        userId: account.userId,
        socialAccountId: account.id,
        platform: account.platform,
        status: "SCHEDULED",
        content: selectedPromo,
        contentVariants: [selectedPromo],
        scheduledAt,
        jitteredAt: scheduledAt,
        jitterSeconds: 0,
      });

      // Next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Insert in batches of 100 to avoid large payload errors
    const chunkSize = 100;
    for (let i = 0; i < dataToInsert.length; i += chunkSize) {
      const chunk = dataToInsert.slice(i, i + chunkSize);
      await prisma.post.createMany({ data: chunk });
      console.log(`Inserted ${i + chunk.length} / ${dataToInsert.length}`);
    }
  }

  console.log("Done scheduling promos!");
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
