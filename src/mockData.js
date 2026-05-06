export const INITIAL_POLES = [
  'Je parraine un Orphelin !',
  '1 Forage par mois et Madrassah',
  "Puits d'eau au Sahel",
  'Aide alimentaire Ramadan',
];

export const INITIAL_DONORS = [
  { id: '1', firstName: 'Salman',  lastName: 'Beaufort',  email: 'salmanbeaufort.perso@gmail.com', phone: '+33 6 12 34 56 78', pole: 'Je parraine un Orphelin !',        amount: 30, startDate: '2024-03-01', lastPayment: '2026-04-15', status: 'ACTIF',  delayMonths: 0, paymentMethod: 'helloasso', notes: '',                                              lastContactDate: null,         lastContactResult: null },
  { id: '2', firstName: 'Mamadou', lastName: 'Sarr',      email: 'mamsaka2@gmail.com',             phone: '+33 7 65 43 21 09', pole: '1 Forage par mois et Madrassah',    amount: 50, startDate: '2023-09-01', lastPayment: '2026-04-15', status: 'ACTIF',  delayMonths: 0, paymentMethod: 'helloasso', notes: 'Donateur très fidèle depuis 2023.', lastContactDate: null,         lastContactResult: null },
  { id: '3', firstName: 'Rachid',  lastName: 'Ouassou',   email: 'ouas5205@gmail.com',             phone: '+33 6 98 76 54 32', pole: 'Je parraine un Orphelin !',        amount: 30, startDate: '2024-01-01', lastPayment: '2025-12-15', status: 'RETARD', delayMonths: 4, paymentMethod: 'helloasso', notes: '',                                              lastContactDate: '2026-02-20', lastContactResult: 'Sans réponse' },
  { id: '4', firstName: 'Samir',   lastName: 'Hammouti',  email: 'samir.hammouti59@gmail.com',     phone: '+33 6 11 22 33 44', pole: 'Je parraine un Orphelin !',        amount: 30, startDate: '2024-06-01', lastPayment: '2026-02-15', status: 'RETARD', delayMonths: 2, paymentMethod: 'virement',  notes: 'Préfère payer par virement bancaire.', lastContactDate: '2026-03-10', lastContactResult: 'Répondu — régularise bientôt' },
  { id: '5', firstName: 'Fatima',  lastName: 'Benali',    email: 'fatima.benali@gmail.com',        phone: '+33 6 55 44 33 22', pole: "Puits d'eau au Sahel",             amount: 20, startDate: '2025-01-01', lastPayment: '2026-04-15', status: 'ACTIF',  delayMonths: 0, paymentMethod: 'virement',  notes: '',                                              lastContactDate: null,         lastContactResult: null },
  { id: '6', firstName: 'Youssef', lastName: 'El Amrani', email: 'yelamrani@outlook.com',          phone: '+33 7 88 99 00 11', pole: '1 Forage par mois et Madrassah',    amount: 50, startDate: '2023-05-01', lastPayment: '2025-10-01', status: 'ARRETE', delayMonths: 0, paymentMethod: 'helloasso', notes: "Arrêt suite à déménagement. Peut reprendre en 2026.", lastContactDate: '2025-11-15', lastContactResult: 'Répondu — arrêt définitif' },
  { id: '7', firstName: 'Khadija', lastName: 'Mansouri',  email: 'khadija.mansouri@gmail.com',     phone: '+33 6 22 33 44 55', pole: 'Je parraine un Orphelin !',        amount: 30, startDate: '2025-03-01', lastPayment: '2026-03-15', status: 'RETARD', delayMonths: 1, paymentMethod: 'helloasso', notes: '',                                              lastContactDate: null,         lastContactResult: null },
];

export const INITIAL_PAYMENTS = [
  { id: 'p1',  date: '15/04/2026 10:30', timestamp: Date.now() -   200000, donorId: '1', donor: 'Salman Beaufort',  email: 'salmanbeaufort.perso@gmail.com', amount: 30, pole: 'Je parraine un Orphelin !',        status: 'Payé',   source: 'helloasso', reference: '' },
  { id: 'p2',  date: '15/04/2026 11:00', timestamp: Date.now() -   190000, donorId: '2', donor: 'Mamadou Sarr',     email: 'mamsaka2@gmail.com',             amount: 50, pole: '1 Forage par mois et Madrassah',    status: 'Payé',   source: 'helloasso', reference: '' },
  { id: 'p3',  date: '15/04/2026 09:00', timestamp: Date.now() -   210000, donorId: '5', donor: 'Fatima Benali',    email: 'fatima.benali@gmail.com',        amount: 20, pole: "Puits d'eau au Sahel",             status: 'Payé',   source: 'virement',  reference: 'VIR-2026-04-001' },
  { id: 'p4',  date: '15/03/2026 10:30', timestamp: Date.now() -  5000000, donorId: '1', donor: 'Salman Beaufort',  email: 'salmanbeaufort.perso@gmail.com', amount: 30, pole: 'Je parraine un Orphelin !',        status: 'Payé',   source: 'helloasso', reference: '' },
  { id: 'p5',  date: '15/03/2026 11:00', timestamp: Date.now() -  4900000, donorId: '2', donor: 'Mamadou Sarr',     email: 'mamsaka2@gmail.com',             amount: 50, pole: '1 Forage par mois et Madrassah',    status: 'Payé',   source: 'helloasso', reference: '' },
  { id: 'p6',  date: '15/03/2026 09:00', timestamp: Date.now() -  5100000, donorId: '5', donor: 'Fatima Benali',    email: 'fatima.benali@gmail.com',        amount: 20, pole: "Puits d'eau au Sahel",             status: 'Payé',   source: 'virement',  reference: 'VIR-2026-03-001' },
  { id: 'p7',  date: '15/03/2026 14:00', timestamp: Date.now() -  4800000, donorId: '7', donor: 'Khadija Mansouri', email: 'khadija.mansouri@gmail.com',     amount: 30, pole: 'Je parraine un Orphelin !',        status: 'Payé',   source: 'helloasso', reference: '' },
  { id: 'p8',  date: '15/02/2026 10:30', timestamp: Date.now() - 10000000, donorId: '4', donor: 'Samir Hammouti',   email: 'samir.hammouti59@gmail.com',     amount: 30, pole: 'Je parraine un Orphelin !',        status: 'Refusé', source: 'virement',  reference: '' },
  { id: 'p9',  date: '15/12/2025 10:30', timestamp: Date.now() - 15000000, donorId: '3', donor: 'Rachid Ouassou',   email: 'ouas5205@gmail.com',             amount: 30, pole: 'Je parraine un Orphelin !',        status: 'Refusé', source: 'helloasso', reference: '' },
  { id: 'p10', date: '15/10/2025 09:00', timestamp: Date.now() - 20000000, donorId: '6', donor: 'Youssef El Amrani',email: 'yelamrani@outlook.com',          amount: 50, pole: '1 Forage par mois et Madrassah',    status: 'Payé',   source: 'helloasso', reference: '' },
];

export const INITIAL_RELANCES = [
  { id: 'r1', donorId: '3', date: '2026-02-20', result: 'Sans réponse', note: 'Email envoyé via le back office. Aucune réponse après 7 jours.' },
  { id: 'r2', donorId: '4', date: '2026-03-10', result: 'Répondu',      note: 'Appel téléphonique. Dit qu\'il va régulariser dans la semaine.' },
];

export const OUTGOING_SCHEDULE = [
  { id: 'out1',  date: '2026-02-20', pole: 'Je parraine un Orphelin !',      destination: 'Cameroun', amount: 90,  status: 'envoyé',   note: '3 dons × 30 €' },
  { id: 'out2',  date: '2026-02-20', pole: '1 Forage par mois et Madrassah', destination: 'Cameroun', amount: 100, status: 'envoyé',   note: '2 dons × 50 €' },
  { id: 'out3',  date: '2026-02-20', pole: "Puits d'eau au Sahel",            destination: 'Sahel',    amount: 20,  status: 'envoyé',   note: '1 don × 20 €' },
  { id: 'out4',  date: '2026-03-20', pole: 'Je parraine un Orphelin !',      destination: 'Cameroun', amount: 90,  status: 'envoyé',   note: '3 dons × 30 €' },
  { id: 'out5',  date: '2026-03-20', pole: '1 Forage par mois et Madrassah', destination: 'Cameroun', amount: 50,  status: 'envoyé',   note: '1 don actif × 50 €' },
  { id: 'out6',  date: '2026-03-20', pole: "Puits d'eau au Sahel",            destination: 'Sahel',    amount: 20,  status: 'envoyé',   note: '1 don × 20 €' },
  { id: 'out7',  date: '2026-04-20', pole: 'Je parraine un Orphelin !',      destination: 'Cameroun', amount: 60,  status: 'envoyé',   note: '2 dons reçus × 30 € (1 retard non couvert)' },
  { id: 'out8',  date: '2026-04-20', pole: '1 Forage par mois et Madrassah', destination: 'Cameroun', amount: 50,  status: 'envoyé',   note: '1 don × 50 €' },
  { id: 'out9',  date: '2026-04-20', pole: "Puits d'eau au Sahel",            destination: 'Sahel',    amount: 20,  status: 'envoyé',   note: '1 don × 20 €' },
  { id: 'out10', date: '2026-05-20', pole: 'Je parraine un Orphelin !',      destination: 'Cameroun', amount: 90,  status: 'planifié', note: 'Prévision : 3 dons attendus × 30 €' },
  { id: 'out11', date: '2026-05-20', pole: '1 Forage par mois et Madrassah', destination: 'Cameroun', amount: 50,  status: 'planifié', note: 'Prévision : 1 don attendu × 50 €' },
  { id: 'out12', date: '2026-05-20', pole: "Puits d'eau au Sahel",            destination: 'Sahel',    amount: 20,  status: 'planifié', note: 'Prévision : 1 don attendu × 20 €' },
  { id: 'out13', date: '2026-06-20', pole: 'Je parraine un Orphelin !',      destination: 'Cameroun', amount: 90,  status: 'planifié', note: 'Prévision basée sur dons actifs' },
  { id: 'out14', date: '2026-06-20', pole: '1 Forage par mois et Madrassah', destination: 'Cameroun', amount: 50,  status: 'planifié', note: 'Prévision basée sur dons actifs' },
  { id: 'out15', date: '2026-06-20', pole: "Puits d'eau au Sahel",            destination: 'Sahel',    amount: 20,  status: 'planifié', note: 'Prévision basée sur dons actifs' },
];

export const INITIAL_ENVOIS = [
  {
    id: 'env1',
    date: '2026-04-24',
    method: 'remitly',
    destination: 'Cameroun',
    status: 'envoyé',
    reference: 'REM-2026-04-001',
    fraisPct: 2,
    items: [
      { id: 1, emoji: '💧', label: '3 forages (×2)', eur: 3600, fcfa: 2361600 },
      { id: 2, emoji: '🐑', label: 'Aquiqah Belkacem', eur: 100, fcfa: 65600 },
      { id: 3, emoji: '🐑', label: 'Aquiqah Sevestre', eur: 160, fcfa: 104960 },
      { id: 4, emoji: '📋', label: 'Les laisser passer', eur: 190, fcfa: 125000 },
      { id: 5, emoji: '🕌', label: 'Salaire enseignants mois Avril', eur: 115, fcfa: 75000 },
      { id: 6, emoji: '💲', label: 'Gestion Alucaa 2 mois mars/avril', eur: 52, fcfa: 33600 },
      { id: 7, emoji: '📦', label: 'Colis alimentaire avril', eur: 587, fcfa: 392000 },
    ],
    note: 'Envoi urgent terrain — dossiers prioritaires avril 2026',
  },
];

// Mock Remitly API response — remplacé par vraie API lors de l'intégration
export const MOCK_REMITLY_TRANSFERS = [
  {
    id: 'REM-2026-05-001',
    reference: 'REM-2026-05-001',
    date: '2026-05-02',
    amountSentEur: 820,
    amountReceivedFcfa: 537920,
    exchangeRate: 656,
    feesEur: 4.99,
    recipient: 'Harouna Diallo',
    remitlyStatus: 'DELIVERED',
  },
  {
    id: 'REM-2026-04-001',
    reference: 'REM-2026-04-001',
    date: '2026-04-24',
    amountSentEur: 4804,
    amountReceivedFcfa: 3151424,
    exchangeRate: 656,
    feesEur: 9.99,
    recipient: 'Harouna Diallo',
    remitlyStatus: 'DELIVERED',
  },
  {
    id: 'REM-2026-03-020',
    reference: 'REM-2026-03-020',
    date: '2026-03-20',
    amountSentEur: 630,
    amountReceivedFcfa: 413280,
    exchangeRate: 656,
    feesEur: 4.99,
    recipient: 'Harouna Diallo',
    remitlyStatus: 'DELIVERED',
  },
  {
    id: 'REM-2026-02-18',
    reference: 'REM-2026-02-18',
    date: '2026-02-18',
    amountSentEur: 1200,
    amountReceivedFcfa: 787200,
    exchangeRate: 656,
    feesEur: 7.99,
    recipient: 'Harouna Diallo',
    remitlyStatus: 'DELIVERED',
  },
];

export const MONTHLY_STATS = [
  { month: 'Nov', year: 2025, received: 130, expected: 160 },
  { month: 'Déc', year: 2025, received:  80, expected: 160 },
  { month: 'Jan', year: 2026, received: 150, expected: 160 },
  { month: 'Fév', year: 2026, received: 100, expected: 160 },
  { month: 'Mar', year: 2026, received: 130, expected: 160 },
  { month: 'Avr', year: 2026, received: 100, expected: 160 },
];
