import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clear() {
  console.log('🗑️  Suppression des données mock...');

  await prisma.activityLog.deleteMany();
  await prisma.relance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.envoiItem.deleteMany();
  await prisma.envoi.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.pole.deleteMany();

  console.log('✅ Base vidée — utilisateurs conservés.');
  await prisma.$disconnect();
}

clear().catch((e) => { console.error(e); process.exit(1); });
