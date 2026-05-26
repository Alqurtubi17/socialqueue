import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const promoA = `haloo! solutionist open yaa. ayo yang mau konsultasi skripsi (kuantitatif), olah data (spss, eviews, stata, smartpls, dll), analisis data, coding, web, ML, NLP, data mining langsung hit me up yaa di WA dijamin satset dan trusted

#zonauang #jokitugas #jokispss`;

const promoB = `hewoooo! solutionist open yaaa. ayo yg mau olah data/tutor masih ada beberapa slot nihhh

#zonauang #jokitugas`;

async function main() {
  const accounts = await prisma.socialAccount.findMany({
    where: { isActive: true },
  });

  if (accounts.length === 0) {
    console.log("Tidak ada akun sosial yang terhubung.");
    return;
  }

  // Kita jadwalkan untuk 60 hari ke depan
  const daysToSchedule = 60;

  for (const account of accounts) {
    console.log(`Menjadwalkan promo harian untuk ${account.platformUsername} (${account.platform})...`);
    
    // Kita set jam tayang harian ke jam 10:00 pagi
    let currentDate = new Date();
    currentDate.setHours(10, 0, 0, 0);

    // Mulai dari besok pagi
    currentDate.setDate(currentDate.getDate() + 1);

    let countAdded = 0;
    for (let i = 0; i < daysToSchedule; i++) {
      // Selang-seling: hari genap promoA, hari ganjil promoB
      const content = i % 2 === 0 ? promoA : promoB;
      const scheduledAt = new Date(currentDate);
      
      // Jitter acak antara 1 sampai 30 menit agar tidak ketahuan bot
      const jitterSeconds = Math.floor(Math.random() * 1800) + 60;
      const jitteredAt = new Date(scheduledAt.getTime() + (jitterSeconds * 1000));

      await prisma.post.create({
        data: {
          userId: account.userId,
          socialAccountId: account.id,
          content: content,
          platform: account.platform,
          status: "SCHEDULED",
          scheduledAt: scheduledAt,
          jitteredAt: jitteredAt,
          jitterSeconds: jitterSeconds,
        }
      });
      
      countAdded++;
      // Lanjut ke hari berikutnya
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`✅ Berhasil menambahkan ${countAdded} postingan promo untuk ${account.platformUsername}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
