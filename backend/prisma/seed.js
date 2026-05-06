import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const POLES = [
  'Je parraine un Orphelin !',
  '1 Forage par mois et Madrassah',
  "Puits d'eau au Sahel",
  'Aide alimentaire Ramadan',
];

const USERS = [
  { email: 'admin@humanit.fr', password: 'admin123', firstName: 'Admin', lastName: 'Humanit', role: 'admin' },
  { email: 'tresorier@humanit.fr', password: 'treso123', firstName: 'Trésorier', lastName: 'Humanit', role: 'tresorier' },
  { email: 'benevole@humanit.fr', password: 'benev123', firstName: 'Bénévole', lastName: 'Humanit', role: 'benevole' },
];

async function main() {
  console.log('Seeding database...');

  // Users
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hash },
    });
  }
  console.log('✓ Users créés');

  // Poles
  const poleMap = {};
  for (const name of POLES) {
    const pole = await prisma.pole.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    poleMap[name] = pole.id;
  }
  console.log('✓ Pôles créés');

  // Donors
  const donors = [
    {
      firstName: 'Marie', lastName: 'Dupont', email: 'marie.dupont@email.com',
      phone: '06 12 34 56 78',
      pole: 'Je parraine un Orphelin !',
      amount: 30, startDate: '2023-01-15', lastPayment: '2024-07-15',
      status: 'RETARD', delayMonths: 2, paymentMethod: 'helloasso',
      notes: 'Donatrice fidèle depuis 2023',
    },
    {
      firstName: 'Jean', lastName: 'Martin', email: 'jean.martin@email.com',
      phone: '07 23 45 67 89',
      pole: '1 Forage par mois et Madrassah',
      amount: 50, startDate: '2022-06-01', lastPayment: '2024-09-01',
      status: 'ACTIF', delayMonths: 0, paymentMethod: 'virement',
      notes: '',
    },
    {
      firstName: 'Sophie', lastName: 'Bernard', email: 'sophie.bernard@email.com',
      phone: '06 34 56 78 90',
      pole: "Puits d'eau au Sahel",
      amount: 25, startDate: '2023-03-10', lastPayment: '2024-08-10',
      status: 'RETARD', delayMonths: 1, paymentMethod: 'helloasso',
      notes: 'A mentionné des difficultés financières',
    },
    {
      firstName: 'Pierre', lastName: 'Leroy', email: 'pierre.leroy@email.com',
      phone: '07 45 67 89 01',
      pole: 'Je parraine un Orphelin !',
      amount: 40, startDate: '2022-11-20', lastPayment: '2024-09-20',
      status: 'ACTIF', delayMonths: 0, paymentMethod: 'virement',
      notes: '',
    },
    {
      firstName: 'Isabelle', lastName: 'Moreau', email: 'isabelle.moreau@email.com',
      phone: '06 56 78 90 12',
      pole: 'Aide alimentaire Ramadan',
      amount: 20, startDate: '2023-07-05', lastPayment: null,
      status: 'ARRETE', delayMonths: 0, paymentMethod: 'helloasso',
      notes: 'A demandé une pause',
    },
    {
      firstName: 'François', lastName: 'Petit', email: 'francois.petit@email.com',
      phone: '07 67 89 01 23',
      pole: '1 Forage par mois et Madrassah',
      amount: 60, startDate: '2021-09-15', lastPayment: '2024-06-15',
      status: 'RETARD', delayMonths: 3, paymentMethod: 'virement',
      notes: 'Gros donateur, à relancer en priorité',
    },
    {
      firstName: 'Claire', lastName: 'Simon', email: 'claire.simon@email.com',
      phone: '06 78 90 12 34',
      pole: "Puits d'eau au Sahel",
      amount: 35, startDate: '2023-05-22', lastPayment: '2024-09-22',
      status: 'ACTIF', delayMonths: 0, paymentMethod: 'helloasso',
      notes: '',
    },
  ];

  const donorMap = {};
  for (const d of donors) {
    const { pole, ...rest } = d;
    const donor = await prisma.donor.upsert({
      where: { email: rest.email },
      update: {},
      create: {
        ...rest,
        poleId: poleMap[pole],
        startDate: new Date(rest.startDate),
        lastPayment: rest.lastPayment ? new Date(rest.lastPayment) : null,
      },
    });
    donorMap[rest.email] = donor;
  }
  console.log('✓ Donateurs créés');

  // Payments
  const payments = [
    { email: 'marie.dupont@email.com', amount: 30, date: '2024-07-15', status: 'Paye', source: 'helloasso', reference: 'HA-2024-001' },
    { email: 'jean.martin@email.com', amount: 50, date: '2024-09-01', status: 'Paye', source: 'virement', reference: 'VIR-2024-001' },
    { email: 'sophie.bernard@email.com', amount: 25, date: '2024-08-10', status: 'Paye', source: 'helloasso', reference: 'HA-2024-002' },
    { email: 'pierre.leroy@email.com', amount: 40, date: '2024-09-20', status: 'Paye', source: 'virement', reference: 'VIR-2024-002' },
    { email: 'jean.martin@email.com', amount: 50, date: '2024-08-01', status: 'Paye', source: 'virement', reference: 'VIR-2024-003' },
    { email: 'claire.simon@email.com', amount: 35, date: '2024-09-22', status: 'Paye', source: 'helloasso', reference: 'HA-2024-003' },
    { email: 'francois.petit@email.com', amount: 60, date: '2024-06-15', status: 'Paye', source: 'virement', reference: 'VIR-2024-004' },
    { email: 'marie.dupont@email.com', amount: 30, date: '2024-06-15', status: 'Paye', source: 'helloasso', reference: 'HA-2024-004' },
    { email: 'sophie.bernard@email.com', amount: 25, date: '2024-07-10', status: 'Refuse', source: 'helloasso', reference: 'HA-2024-005' },
    { email: 'claire.simon@email.com', amount: 35, date: '2024-08-22', status: 'Paye', source: 'helloasso', reference: 'HA-2024-006' },
  ];

  for (const p of payments) {
    const donor = donorMap[p.email];
    if (!donor) continue;
    await prisma.payment.create({
      data: {
        donorId: donor.id,
        poleId: donor.poleId,
        amount: p.amount,
        status: p.status,
        source: p.source,
        reference: p.reference,
        date: new Date(p.date),
      },
    });
  }
  console.log('✓ Paiements créés');

  // One sample envoi
  await prisma.envoi.create({
    data: {
      date: new Date('2024-09-01'),
      method: 'remitly',
      destination: 'Mali',
      status: 'envoye',
      reference: 'REM2024-001',
      fraisPct: 0.8,
      exchangeRate: 656,
      note: 'Achat matériel forage',
      remitlyId: 'SEED_ENV_001',
      items: {
        create: [
          { emoji: '🔧', label: 'Matériel de forage', eur: 450, fcfa: 295200 },
          { emoji: '🚗', label: 'Transport', eur: 50, fcfa: 32800 },
        ],
      },
    },
  });
  console.log('✓ Envoi créé');

  console.log('\n✅ Seed terminé!');
  console.log('Comptes disponibles:');
  USERS.forEach((u) => console.log(`  ${u.role}: ${u.email} / ${u.password}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
