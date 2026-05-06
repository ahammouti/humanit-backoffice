import prisma from '../config/database.js';

export const getStats = async (req, res, next) => {
  try {
    const { pole } = req.query;
    const donorWhere = { pole: pole ? { name: pole, helloassoState: 'Public' } : { helloassoState: 'Public' }, deletedAt: null };

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const poleFilter   = { pole: pole ? { name: pole, helloassoState: 'Public' } : { helloassoState: 'Public' } };

    // Parallel aggregations — no full table scans
    const [
      activeCount, delayedCount, arresteCount, urgentCount,
      expectedAgg, delayedDonors,
      recentPayments, upcomingEnvois,
      poleGroups, allPoles,
      collecteAnnuelleAgg, collecteMensuelleAgg,
      byPoleCollectedAnnuel,
      envoiAnnuel, envoiMensuel,
      // byPoleStats components
      expectedByPole, delayedByPole,
      receivedGlobalByPole, receivedThisMonthByPole,
      activeByPole, arreteByPole,
    ] = await Promise.all([
      prisma.donor.count({ where: { ...donorWhere, status: 'ACTIF'  } }),
      prisma.donor.count({ where: { ...donorWhere, status: 'RETARD' } }),
      prisma.donor.count({ where: { ...donorWhere, status: 'ARRETE' } }),
      prisma.donor.count({ where: { ...donorWhere, status: 'RETARD', lastContactDate: null } }),

      prisma.donor.aggregate({
        where: { ...donorWhere, status: { not: 'ARRETE' } },
        _sum: { amount: true },
      }),

      prisma.donor.findMany({
        where: { ...donorWhere, status: 'RETARD' },
        select: { amount: true, delayMonths: true },
      }),

      prisma.payment.findMany({
        where: {
          status: 'Paye',
          date: { gte: sixMonthsAgo },
          pole: pole ? { name: pole, helloassoState: 'Public' } : { helloassoState: 'Public' },
        },
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      }),

      prisma.envoi.findMany({
        where: { status: 'planifie' },
        include: { items: true },
        orderBy: { date: 'asc' },
        take: 5,
      }),

      prisma.donor.groupBy({
        by: ['poleId'],
        where: donorWhere,
        _count: { id: true },
        _sum: { amount: true },
      }),

      prisma.pole.findMany({ select: { id: true, name: true }, where: { helloassoState: 'Public' } }),

      prisma.payment.aggregate({
        where: { status: 'Paye', date: { gte: startOfYear }, ...poleFilter },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'Paye', date: { gte: startOfMonth, lte: endOfMonth }, ...poleFilter },
        _sum: { amount: true },
      }),

      prisma.payment.groupBy({
        by: ['poleId'],
        where: { status: 'Paye', date: { gte: startOfYear }, ...poleFilter },
        _sum: { amount: true },
      }),

      prisma.envoi.findMany({
        where: { status: 'envoye', date: { gte: startOfYear } },
        select: { date: true, fraisPct: true, items: { select: { eur: true } } },
      }),
      prisma.envoi.findMany({
        where: { status: 'envoye', date: { gte: startOfMonth, lte: endOfMonth } },
        select: { date: true, fraisPct: true, items: { select: { eur: true } } },
      }),

      // Per-pole expected (non-ARRETE)
      prisma.donor.groupBy({
        by: ['poleId'],
        where: { ...donorWhere, status: { not: 'ARRETE' } },
        _sum: { amount: true },
      }),
      // Per-pole RETARD donors (for delayedAmount + delayCount)
      prisma.donor.findMany({
        where: { ...donorWhere, status: 'RETARD' },
        select: { poleId: true, amount: true, delayMonths: true },
      }),
      // Per-pole all-time received
      prisma.payment.groupBy({
        by: ['poleId'],
        where: { status: 'Paye', ...poleFilter },
        _sum: { amount: true },
      }),
      // Per-pole this month received
      prisma.payment.groupBy({
        by: ['poleId'],
        where: { status: 'Paye', date: { gte: startOfMonth, lte: endOfMonth }, ...poleFilter },
        _sum: { amount: true },
      }),
      // Per-pole ACTIF count
      prisma.donor.groupBy({
        by: ['poleId'],
        where: { ...donorWhere, status: 'ACTIF' },
        _count: { id: true },
      }),
      // Per-pole ARRETE count
      prisma.donor.groupBy({
        by: ['poleId'],
        where: { ...donorWhere, status: 'ARRETE' },
        _count: { id: true },
      }),
    ]);

    const totalDonors     = activeCount + delayedCount + arresteCount;
    const expectedMonthly = expectedAgg._sum.amount ?? 0;
    const delayedAmount   = delayedDonors.reduce((s, d) => s + d.amount * d.delayMonths, 0);
    const retentionRate   = totalDonors > 0 ? Math.round((activeCount / totalDonors) * 100) : 0;

    const calcEnvoiSum = (envois) => envois.reduce((s, e) => {
      const sub = e.items.reduce((ss, it) => ss + (it.eur || 0), 0);
      return s + Math.round((sub + sub * (e.fraisPct || 0) / 100) * 100) / 100;
    }, 0);

    const collecteAnnuelle  = collecteAnnuelleAgg._sum.amount ?? 0;
    const collecteMensuelle = collecteMensuelleAgg._sum.amount ?? 0;
    const depenseAnnuelle   = calcEnvoiSum(envoiAnnuel);
    const depenseMensuelle  = calcEnvoiSum(envoiMensuel);

    // Monthly stats — last 6 months
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toLocaleString('fr-FR', { month: 'short' });
      const year  = d.getFullYear();
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const received = recentPayments
        .filter(p => { const pd = new Date(p.date); return pd >= start && pd <= end; })
        .reduce((s, p) => s + p.amount, 0);

      monthlyStats.push({ month, year, received, expected: expectedMonthly });
    }

    // By pole — join groupBy result with pole names
    const poleNameMap = new Map(allPoles.map(p => [p.id, p.name]));
    const byPole = poleGroups
      .map(g => ({
        name:   poleNameMap.get(g.poleId) ?? 'Sans pôle',
        count:  g._count.id,
        amount: g._sum.amount ?? 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Per-pole collected this year (for financialData pie chart)
    const byPoleCollectedMap = new Map(byPoleCollectedAnnuel.map(g => [g.poleId, g._sum.amount ?? 0]));
    const byPoleCollected = allPoles.map(p => ({
      name:   p.name,
      annuel: byPoleCollectedMap.get(p.id) ?? 0,
    })).filter(p => p.annuel > 0);

    // byPoleStats — full per-pole breakdown for "Par projet" tab
    const expectedMap         = new Map(expectedByPole.map(g => [g.poleId, g._sum.amount ?? 0]));
    const receivedGlobalMap   = new Map(receivedGlobalByPole.map(g => [g.poleId, g._sum.amount ?? 0]));
    const receivedMonthMap    = new Map(receivedThisMonthByPole.map(g => [g.poleId, g._sum.amount ?? 0]));
    const activeMap           = new Map(activeByPole.map(g => [g.poleId, g._count.id]));
    const arreteMap           = new Map(arreteByPole.map(g => [g.poleId, g._count.id]));
    const delayAmountMap      = new Map();
    const delayCountMap       = new Map();
    for (const d of delayedByPole) {
      delayAmountMap.set(d.poleId, (delayAmountMap.get(d.poleId) ?? 0) + d.amount * d.delayMonths);
      delayCountMap.set(d.poleId,  (delayCountMap.get(d.poleId)  ?? 0) + 1);
    }

    const byPoleStats = allPoles
      .map(p => {
        const exp   = expectedMap.get(p.id) ?? 0;
        const recM  = receivedMonthMap.get(p.id) ?? 0;
        return {
          name:              p.name,
          expected:          exp,
          delayedAmount:     delayAmountMap.get(p.id) ?? 0,
          receivedThisMonth: recM,
          receivedGlobal:    receivedGlobalMap.get(p.id) ?? 0,
          delayCount:        delayCountMap.get(p.id) ?? 0,
          activeCount:       activeMap.get(p.id) ?? 0,
          arreteCount:       arreteMap.get(p.id) ?? 0,
          monthlyBalance:    recM - exp,
        };
      })
      .filter(p => p.expected > 0 || p.receivedGlobal > 0);

    res.json({
      kpis: { activeCount, delayedCount, arresteCount, urgentCount, expectedMonthly, delayedAmount, retentionRate },
      monthlyStats,
      byPole,
      byPoleCollected,
      byPoleStats,
      upcomingEnvois,
      financials: { collecteAnnuelle, collecteMensuelle, depenseAnnuelle, depenseMensuelle },
    });
  } catch (err) {
    next(err);
  }
};

// Lazy drill-down: per-month payment totals for a given pole
export const getPoleHistory = async (req, res, next) => {
  try {
    const { pole } = req.query;
    if (!pole) return res.status(400).json({ error: 'pole param required' });

    const payments = await prisma.payment.findMany({
      where: { status: 'Paye', pole: { name: pole } },
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    // Build { [year]: { [month]: amount } }
    const rec = {};
    for (const p of payments) {
      const d = new Date(p.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (!rec[y]) rec[y] = {};
      rec[y][m] = (rec[y][m] ?? 0) + p.amount;
    }

    // Expected monthly for this pole (non-ARRETE donors)
    const agg = await prisma.donor.aggregate({
      where: { pole: { name: pole }, status: { not: 'ARRETE' } },
      _sum: { amount: true },
    });

    res.json({ rec, expected: agg._sum.amount ?? 0 });
  } catch (err) {
    next(err);
  }
};
