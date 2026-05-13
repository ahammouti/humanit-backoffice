import prisma from '../config/database.js';
import { computeStatus } from '../services/donorStatus.js';
import { getAutoArreteMonths } from './settingsController.js';

// Refresh all non-ARRETE mensuel donors' status based on current date.
// En_attente payments count as "paid" for delay calculation.
// Donors with delayMonths >= autoArreteMonths are automatically set to ARRETE.
const refreshAllStatuses = async () => {
  const [autoArreteMonths, donors] = await Promise.all([
    getAutoArreteMonths(),
    prisma.donor.findMany({
      where: { deletedAt: null, status: { not: 'ARRETE' }, paymentFrequency: 'mensuel' },
      select: {
        id: true, status: true, delayMonths: true, lastPayment: true, startDate: true, paymentFrequency: true,
        payments: {
          where: { status: { in: ['Paye', 'En_attente'] } },
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true },
        },
      },
    }),
  ]);

  const updates = donors.map(d => {
    const recentPaymentDate = d.payments[0]?.date ?? null;
    const effectiveLastPayment =
      recentPaymentDate && (!d.lastPayment || new Date(recentPaymentDate) > new Date(d.lastPayment))
        ? recentPaymentDate
        : d.lastPayment;

    let { status, delayMonths } = computeStatus({ ...d, lastPayment: effectiveLastPayment });

    // Auto-ARRETE if delay exceeds configured threshold
    if (status === 'RETARD' && delayMonths >= autoArreteMonths) {
      status = 'ARRETE';
    }

    if (status !== d.status || delayMonths !== d.delayMonths) {
      return prisma.donor.update({ where: { id: d.id }, data: { status, delayMonths } });
    }
    return null;
  }).filter(Boolean);

  if (updates.length > 0) await Promise.all(updates);
};

export const getStats = async (req, res, next) => {
  try {
    await refreshAllStatuses();
    const { pole, year: qYear, month: qMonth } = req.query;
    const donorWhere = { pole: pole ? { name: pole, helloassoState: 'Public' } : { helloassoState: 'Public' }, deletedAt: null };

    // Support navigation to past periods via ?year=YYYY&month=MM
    const realNow = new Date();
    const now = (qYear || qMonth)
      ? new Date(parseInt(qYear ?? realNow.getFullYear()), qMonth ? parseInt(qMonth) - 1 : 0, 15)
      : realNow;
    const sixMonthsAgo    = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfYear     = new Date(now.getFullYear(), 0, 1);
    const endOfYear       = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth      = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfPrevYear   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    // Payment filter: no helloassoState restriction — historical totals must include all forms (Private/Disabled)
    // regardless of their current state, so data matches HelloAsso for any given period.
    const paymentPoleFilter = pole ? { pole: { name: pole } } : {};

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
      // ponctuel stats
      ponctuelsCount, ponctuelsAnnuelAgg, ponctuelsMonthAgg,
      collectePrevYearAgg, yearPayments,
      donorsPaidMonthRows, donorsPaidYearRows,
      mensuelsAtEndOfMonth, mensuelsAtEndOfYear,
    ] = await Promise.all([
      prisma.donor.count({ where: { ...donorWhere, status: 'ACTIF'  } }),
      prisma.donor.count({ where: { ...donorWhere, status: 'RETARD' } }),
      prisma.donor.count({ where: { ...donorWhere, status: 'ARRETE' } }),
      prisma.donor.count({ where: { ...donorWhere, status: 'RETARD', lastContactDate: null } }),

      prisma.donor.aggregate({
        where: { ...donorWhere, status: { not: 'ARRETE' }, paymentFrequency: 'mensuel' },
        _sum: { amount: true },
      }),

      prisma.donor.findMany({
        where: { ...donorWhere, status: 'RETARD' },
        select: {
          amount: true, delayMonths: true, lastPayment: true, startDate: true, paymentFrequency: true,
          payments: {
            where: { status: { in: ['Paye', 'En_attente'] } },
            orderBy: { date: 'desc' },
            take: 1,
            select: { date: true },
          },
        },
      }),

      prisma.payment.findMany({
        where: { status: 'Paye', date: { gte: sixMonthsAgo }, ...paymentPoleFilter },
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

      prisma.pole.findMany({ select: { id: true, name: true, helloassoState: true } }),

      prisma.payment.aggregate({
        where: { status: 'Paye', date: { gte: startOfYear, lte: endOfYear }, ...paymentPoleFilter },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'Paye', date: { gte: startOfMonth, lte: endOfMonth }, ...paymentPoleFilter },
        _sum: { amount: true },
      }),

      prisma.payment.groupBy({
        by: ['poleId'],
        where: { status: 'Paye', date: { gte: startOfYear, lte: endOfYear }, ...paymentPoleFilter },
        _sum: { amount: true },
      }),

      prisma.envoi.findMany({
        where: { status: 'envoye', date: { gte: startOfYear, lte: endOfYear } },
        select: { date: true, fraisPct: true, items: { select: { eur: true } } },
      }),
      prisma.envoi.findMany({
        where: { status: 'envoye', date: { gte: startOfMonth, lte: endOfMonth } },
        select: { date: true, fraisPct: true, items: { select: { eur: true } } },
      }),

      // Per-pole expected (non-ARRETE, mensuel only)
      prisma.donor.groupBy({
        by: ['poleId'],
        where: { ...donorWhere, status: { not: 'ARRETE' }, paymentFrequency: 'mensuel' },
        _sum: { amount: true },
      }),
      // Per-pole RETARD donors (for delayedAmount + delayCount)
      prisma.donor.findMany({
        where: { ...donorWhere, status: 'RETARD' },
        select: {
          poleId: true, amount: true, delayMonths: true, lastPayment: true, startDate: true, paymentFrequency: true,
          payments: {
            where: { status: { in: ['Paye', 'En_attente'] } },
            orderBy: { date: 'desc' },
            take: 1,
            select: { date: true },
          },
        },
      }),
      // Per-pole all-time received
      prisma.payment.groupBy({
        by: ['poleId'],
        where: { status: 'Paye', ...paymentPoleFilter },
        _sum: { amount: true },
      }),
      // Per-pole this month received
      prisma.payment.groupBy({
        by: ['poleId'],
        where: { status: 'Paye', date: { gte: startOfMonth, lte: endOfMonth }, ...paymentPoleFilter },
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
      // Ponctuel donors count (non-ARRETE)
      prisma.donor.count({ where: { ...donorWhere, paymentFrequency: 'ponctuel', status: { not: 'ARRETE' } } }),
      // Ponctuel payments this year
      prisma.payment.aggregate({
        where: { status: 'Paye', date: { gte: startOfYear, lte: endOfYear }, donor: { paymentFrequency: 'ponctuel' }, ...paymentPoleFilter },
        _sum: { amount: true },
      }),
      // Ponctuel payments this month
      prisma.payment.aggregate({
        where: { status: 'Paye', date: { gte: startOfMonth, lte: endOfMonth }, donor: { paymentFrequency: 'ponctuel' }, ...paymentPoleFilter },
        _sum: { amount: true },
      }),
      // Previous year total (for annual trend)
      prisma.payment.aggregate({
        where: { status: 'Paye', date: { gte: startOfPrevYear, lte: endOfPrevYear }, ...paymentPoleFilter },
        _sum: { amount: true },
      }),
      // Full year payments (for 12-month chart)
      prisma.payment.findMany({
        where: { status: 'Paye', date: { gte: startOfYear, lte: endOfYear }, ...paymentPoleFilter },
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      }),
      // Distinct MENSUEL Public-pole donors who paid this month (base for fidélité — consistent with mensuelsAtEndOfMonth)
      prisma.payment.findMany({
        where: {
          status: 'Paye', date: { gte: startOfMonth, lte: endOfMonth },
          donor: { paymentFrequency: 'mensuel', deletedAt: null, pole: pole ? { name: pole, helloassoState: 'Public' } : { helloassoState: 'Public' } },
        },
        select: { donorId: true },
        distinct: ['donorId'],
      }),
      // Distinct MENSUEL Public-pole donors who paid this year
      prisma.payment.findMany({
        where: {
          status: 'Paye', date: { gte: startOfYear, lte: endOfYear },
          donor: { paymentFrequency: 'mensuel', deletedAt: null, pole: pole ? { name: pole, helloassoState: 'Public' } : { helloassoState: 'Public' } },
        },
        select: { donorId: true },
        distinct: ['donorId'],
      }),
      // Mensuel donors who had started by end of month (historical base for "n'ont pas payé")
      prisma.donor.count({
        where: { ...donorWhere, paymentFrequency: 'mensuel', startDate: { lte: endOfMonth } },
      }),
      // Mensuel donors who had started by end of year
      prisma.donor.count({
        where: { ...donorWhere, paymentFrequency: 'mensuel', startDate: { lte: endOfYear } },
      }),
    ]);

    const totalDonors     = activeCount + delayedCount + arresteCount;
    const expectedMonthly = expectedAgg._sum.amount ?? 0;
    const delayedAmount   = delayedDonors.reduce((s, d) => {
      const recentPaymentDate = d.payments?.[0]?.date ?? null;
      const effectiveLastPayment =
        recentPaymentDate && (!d.lastPayment || new Date(recentPaymentDate) > new Date(d.lastPayment))
          ? recentPaymentDate : d.lastPayment;
      const { delayMonths } = computeStatus({ ...d, lastPayment: effectiveLastPayment });
      return s + d.amount * delayMonths;
    }, 0);
    const retentionRate      = totalDonors > 0 ? Math.round((activeCount / totalDonors) * 100) : 0;
    const donorsPaidMonth    = donorsPaidMonthRows.length;
    const donorsPaidYear     = donorsPaidYearRows.length;
    const nonArreteDonors    = activeCount + delayedCount;
    // Use historical base (donors started by end of period) for fidélité and "n'ont pas payé"
    const baseMonth          = mensuelsAtEndOfMonth || nonArreteDonors;
    const baseYear           = mensuelsAtEndOfYear  || nonArreteDonors;
    const notPaidMonth       = Math.max(0, baseMonth - donorsPaidMonth);
    const notPaidYear        = Math.max(0, baseYear  - donorsPaidYear);
    const fidélitéMois       = baseMonth > 0 ? Math.round(donorsPaidMonth / baseMonth * 100) : 0;
    const fidélitéAnnée      = baseYear  > 0 ? Math.round(donorsPaidYear  / baseYear  * 100) : 0;

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

    // Split poles: all for payment name mapping, Public only for "Par projet" tab
    const publicPoles  = allPoles.filter(p => p.helloassoState === 'Public');

    // By pole — join groupBy result with pole names (Public only for donor stats)
    const poleNameMap = new Map(publicPoles.map(p => [p.id, p.name]));
    const byPole = poleGroups
      .map(g => ({
        name:   poleNameMap.get(g.poleId) ?? 'Sans pôle',
        count:  g._count.id,
        amount: g._sum.amount ?? 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Per-pole collected this year & this month — all poles (no helloassoState filter)
    const byPoleCollectedMap = new Map(byPoleCollectedAnnuel.map(g => [g.poleId, g._sum.amount ?? 0]));

    // Per-pole monthly data (separate query after main batch)
    const byPoleCollectedMensuelAgg = await prisma.payment.groupBy({
      by: ['poleId'],
      where: { status: 'Paye', date: { gte: startOfMonth, lte: endOfMonth }, ...paymentPoleFilter },
      _sum: { amount: true },
    });
    const byPoleCollectedMensuelMap = new Map(byPoleCollectedMensuelAgg.map(g => [g.poleId, g._sum.amount ?? 0]));

    const byPoleCollected = allPoles
      .map(p => ({
        name:    p.name,
        annuel:  byPoleCollectedMap.get(p.id) ?? 0,
        mensuel: byPoleCollectedMensuelMap.get(p.id) ?? 0,
      }))
      .filter(p => p.annuel > 0 || p.mensuel > 0);

    // byPoleStats — full per-pole breakdown for "Par projet" tab (Public poles only)
    const expectedMap         = new Map(expectedByPole.map(g => [g.poleId, g._sum.amount ?? 0]));
    const receivedGlobalMap   = new Map(receivedGlobalByPole.map(g => [g.poleId, g._sum.amount ?? 0]));
    const receivedMonthMap    = new Map(receivedThisMonthByPole.map(g => [g.poleId, g._sum.amount ?? 0]));
    const activeMap           = new Map(activeByPole.map(g => [g.poleId, g._count.id]));
    const arreteMap           = new Map(arreteByPole.map(g => [g.poleId, g._count.id]));
    const delayAmountMap      = new Map();
    const delayCountMap       = new Map();
    for (const d of delayedByPole) {
      const recentPaymentDate = d.payments?.[0]?.date ?? null;
      const effectiveLastPayment =
        recentPaymentDate && (!d.lastPayment || new Date(recentPaymentDate) > new Date(d.lastPayment))
          ? recentPaymentDate : d.lastPayment;
      const { delayMonths } = computeStatus({ ...d, lastPayment: effectiveLastPayment });
      delayAmountMap.set(d.poleId, (delayAmountMap.get(d.poleId) ?? 0) + d.amount * delayMonths);
      delayCountMap.set(d.poleId,  (delayCountMap.get(d.poleId)  ?? 0) + 1);
    }

    const byPoleStats = publicPoles
      .map(p => {
        const exp   = expectedMap.get(p.id) ?? 0;
        const recM  = receivedMonthMap.get(p.id) ?? 0;
        return {
          name:              p.name,
          expected:          exp,
          delayedAmount:     delayAmountMap.get(p.id) ?? 0,
          receivedThisMonth: recM,
          receivedAnnuel:    byPoleCollectedMap.get(p.id) ?? 0,
          receivedGlobal:    receivedGlobalMap.get(p.id) ?? 0,
          delayCount:        delayCountMap.get(p.id) ?? 0,
          activeCount:       activeMap.get(p.id) ?? 0,
          arreteCount:       arreteMap.get(p.id) ?? 0,
          monthlyBalance:    recM - exp,
        };
      })
      .filter(p => p.expected > 0 || p.receivedGlobal > 0);

    const ponctuelsThisYear  = ponctuelsAnnuelAgg._sum.amount ?? 0;
    const ponctuelsThisMonth = ponctuelsMonthAgg._sum.amount ?? 0;
    const collectePrevYear   = collectePrevYearAgg._sum.amount ?? 0;

    // Yearly stats — all months of current year
    const yearlyStats = [];
    for (let m = 0; m < 12; m++) {
      const start = new Date(now.getFullYear(), m, 1);
      const end   = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
      const label = start.toLocaleString('fr-FR', { month: 'short' });
      const received = yearPayments
        .filter(p => { const pd = new Date(p.date); return pd >= start && pd <= end; })
        .reduce((s, p) => s + p.amount, 0);
      yearlyStats.push({ month: label, year: now.getFullYear(), received, expected: expectedMonthly });
    }

    res.json({
      kpis: { activeCount, delayedCount, arresteCount, urgentCount, expectedMonthly, delayedAmount, retentionRate, ponctuelsCount, ponctuelsThisYear, ponctuelsThisMonth, donorsPaidMonth, donorsPaidYear, notPaidMonth, notPaidYear, fidélitéMois, fidélitéAnnée },
      monthlyStats,
      yearlyStats,
      byPole,
      byPoleCollected,
      byPoleStats,
      upcomingEnvois,
      financials: { collecteAnnuelle, collecteMensuelle, depenseAnnuelle, depenseMensuelle, collectePrevYear },
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
