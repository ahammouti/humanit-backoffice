import prisma from '../config/database.js';
import { getPayments, getMembers, getForms } from '../services/helloasso.js';
import { refreshDonorStatus, computeStatus } from '../services/donorStatus.js';
import logger from '../utils/logger.js';

async function findOrCreatePole(formName) {
  const poles = await prisma.pole.findMany();
  if (!poles.length) return null;
  const name = (formName ?? '').toLowerCase();
  return (
    poles.find(p => name.includes(p.name.toLowerCase())) ??
    poles.find(p => p.name.toLowerCase().includes(name.split(' ')[0])) ??
    poles[0]
  );
}

export const syncMembers = async (req, res, next) => {
  try {
    const members = await getMembers();
    let created = 0;
    let skipped = 0;

    for (const m of members) {
      const user = m.user ?? m.payer ?? {};
      const email = user.email;
      if (!email) { skipped++; continue; }

      // Résoudre le pôle EN PREMIER — la clé unique est (email, poleId)
      const formName = (m.membership?.membershipFormName ?? m.order?.formName ?? '').trim();
      let pole = null;
      if (formName) {
        pole = await prisma.pole.findFirst({ where: { name: formName } });
        if (!pole) pole = await prisma.pole.create({ data: { name: formName } });
      } else {
        pole = await findOrCreatePole('');
      }
      if (!pole) { skipped++; continue; }

      // Un donateur = une personne dans UN pôle donné
      const existing = await prisma.donor.findUnique({
        where: { email_poleId: { email, poleId: pole.id } },
      });
      if (existing) { skipped++; continue; }

      const startDate = m.order?.date ?? m.membership?.startDate ?? new Date();
      await prisma.donor.create({
        data: {
          firstName: user.firstName ?? 'Inconnu',
          lastName: user.lastName ?? 'Inconnu',
          email,
          poleId: pole.id,
          amount: 0,
          startDate: new Date(startDate),
          paymentMethod: 'helloasso',
          paymentFrequency: 'mensuel', // membre HelloAsso = adhésion récurrente
          status: 'ACTIF',
          delayMonths: 0,
          helloassoMemberId: String(m.id ?? ''),
          helloassoOrderId:  String(m.order?.id ?? ''),
        },
      });
      created++;
      logger.info(`[HelloAsso] Membre créé : ${user.firstName} ${user.lastName} (${pole.name})`);
    }

    res.json({ created, skipped, total: members.length });
  } catch (err) {
    logger.error('[HelloAsso syncMembers]', err.message);
    next(err);
  }
};

export const syncPayments = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const payments = await getPayments(from, to);
    let imported = 0;
    let created = 0;
    let skipped = 0;

    for (const p of payments) {
      const helloassoId = String(p.id);
      const exists = await prisma.payment.findUnique({ where: { helloassoId } });
      if (exists) {
        // Rétro-remplissage : si formType manquait lors de la première sync, on le complète
        if (!exists.formType && p.order?.formType) {
          await prisma.payment.update({ where: { helloassoId }, data: { formType: p.order.formType } });
        }
        skipped++;
        continue;
      }

      const email = p.payer?.email;
      if (!email) { skipped++; continue; }

      const amount = typeof p.amount === 'number' ? p.amount / 100 : 0;
      const formName = (p.order?.formName ?? p.order?.formSlug ?? '').trim();

      // Résoudre le pôle EN PREMIER — la clé unique est (email, poleId)
      let pole = null;
      if (formName) {
        pole = await prisma.pole.findFirst({ where: { name: formName } });
        if (!pole) pole = await prisma.pole.create({ data: { name: formName } });
      } else {
        pole = await findOrCreatePole('');
      }
      if (!pole) { skipped++; continue; }

      // Chercher le donateur par (email, poleId) — même personne dans un autre pôle = nouvelle fiche
      let donor = await prisma.donor.findUnique({
        where: { email_poleId: { email, poleId: pole.id } },
      });

      const formType = p.order?.formType ?? null;

      if (!donor) {
        donor = await prisma.donor.create({
          data: {
            firstName: p.payer.firstName ?? 'Inconnu',
            lastName: p.payer.lastName ?? 'Inconnu',
            email,
            poleId: pole.id,
            amount,
            startDate: new Date(p.date),
            paymentMethod: 'helloasso',
            status: 'ACTIF',
            delayMonths: 0,
            helloassoOrderId: String(p.order?.id ?? ''),
          },
        });
        created++;
      }

      const payment = await prisma.payment.create({
        data: {
          donorId: donor.id,
          poleId: donor.poleId,
          amount,
          status: p.state === 'Authorized' ? 'Paye' : 'En_attente',
          source: 'helloasso',
          helloassoId,
          formType: formType || null,
          date: new Date(p.date),
        },
      });

      // Met à jour lastPayment pour Payé ET En_attente (paiement initié = actif)
      if (payment.status === 'Paye' || payment.status === 'En_attente') {
        const current = await prisma.donor.findUnique({ where: { id: donor.id }, select: { lastPayment: true } });
        if (!current.lastPayment || payment.date > current.lastPayment) {
          await prisma.donor.update({ where: { id: donor.id }, data: { lastPayment: payment.date } });
        }
      }

      imported++;
    }

    // Corrige les donateurs avec amount=0 en utilisant leur dernier paiement
    const zeroAmountDonors = await prisma.donor.findMany({
      where: { amount: 0 },
      include: { payments: { orderBy: { date: 'desc' }, take: 1 } },
    });
    for (const d of zeroAmountDonors) {
      if (d.payments[0]?.amount > 0) {
        await prisma.donor.update({ where: { id: d.id }, data: { amount: d.payments[0].amount } });
      }
    }

    // Auto-classifie mensuel/ponctuel puis recalcule les statuts
    await classifyAndRefreshAll();

    // Sync form states from HelloAsso (Public / Archived / etc.)
    await syncFormStates();

    res.json({ imported, created, skipped, total: payments.length });
  } catch (err) {
    logger.error('[HelloAsso syncPayments]', err.message);
    next(err);
  }
};

/**
 * Classe chaque donateur en mensuel/ponctuel selon son nombre de paiements
 * dans son pôle, puis recalcule son statut ACTIF/RETARD.
 *   ≥ 2 paiements Payé ou En_attente dans le même pôle → mensuel
 *   < 2 paiements                                       → ponctuel
 */
/**
 * Classifie chaque donateur en mensuel/ponctuel, par ordre de priorité :
 *   1. virement                          → mensuel (récurrent par nature)
 *   2. formType "Membership"             → mensuel (adhésion HelloAsso)
 *   3. ≥ 2 paiements consécutifs ≤ 45 j → mensuel (pattern mensuel détecté)
 *      NB : les dons récurrents ont formType "Donation" comme les dons ponctuels,
 *           seul l'intervalle entre paiements permet de les distinguer.
 *   4. Aucun ou 1 seul paiement          → ponctuel
 *   5. 0 paiement                        → inchangé (conserve syncMembers)
 */
async function classifyAndRefreshAll() {
  const donors = await prisma.donor.findMany({
    include: {
      payments: {
        where: { status: { in: ['Paye', 'En_attente'] } },
        select: { formType: true, date: true },
        orderBy: { date: 'asc' },
      },
    },
  });

  let mensuelCount = 0;
  let ponctuelsCount = 0;

  for (const d of donors) {
    let freq = d.paymentFrequency;

    if (d.paymentMethod === 'virement') {
      freq = 'mensuel';
    } else if (d.paymentMethod === 'helloasso') {
      const pmts = d.payments;
      if (pmts.length === 0) {
        // Pas de paiement : on conserve (ex: syncMembers a déjà mis mensuel)
      } else if (pmts.some(p => p.formType === 'Membership')) {
        freq = 'mensuel';
      } else if (pmts.length >= 2) {
        // Pattern mensuel : au moins deux paiements consécutifs espacés de ≤ 45 jours
        const hasMonthlyPattern = pmts.some((p, i) => {
          if (i === 0) return false;
          const days = (new Date(p.date) - new Date(pmts[i - 1].date)) / 86_400_000;
          return days <= 45;
        });
        freq = hasMonthlyPattern ? 'mensuel' : 'ponctuel';
      } else {
        freq = 'ponctuel';
      }
    }

    if (freq !== d.paymentFrequency) {
      await prisma.donor.update({ where: { id: d.id }, data: { paymentFrequency: freq } });
    }

    freq === 'mensuel' ? mensuelCount++ : ponctuelsCount++;
    await refreshDonorStatus(prisma, d.id);
  }

  logger.info(`[HelloAsso] Classification : ${mensuelCount} mensuels, ${ponctuelsCount} ponctuels`);
}

export const debugClassify = async (req, res, next) => {
  try {
    const donors = await prisma.donor.findMany({
      take: 30,
      include: {
        payments: {
          where: { status: { in: ['Paye', 'En_attente'] } },
          select: { formType: true, date: true, status: true },
          orderBy: { date: 'asc' },
        },
      },
    });

    const rows = donors.map(d => {
      const pmts = d.payments;
      let reason = '';
      let freq = d.paymentFrequency;

      if (d.paymentMethod === 'virement') {
        reason = 'virement → mensuel';
        freq = 'mensuel';
      } else if (pmts.length === 0) {
        reason = '0 paiement → inchangé';
      } else if (pmts.some(p => p.formType === 'Membership')) {
        reason = 'formType Membership → mensuel';
        freq = 'mensuel';
      } else if (pmts.length >= 2) {
        const intervals = pmts.slice(1).map((p, i) => {
          const days = Math.round((new Date(p.date) - new Date(pmts[i].date)) / 86_400_000);
          return days;
        });
        const minInterval = Math.min(...intervals);
        if (minInterval <= 45) {
          reason = `${pmts.length} pmts, intervalle min ${minInterval}j ≤ 45 → mensuel`;
          freq = 'mensuel';
        } else {
          reason = `${pmts.length} pmts, intervalle min ${minInterval}j > 45 → ponctuel`;
          freq = 'ponctuel';
        }
      } else {
        reason = '1 seul paiement → ponctuel';
        freq = 'ponctuel';
      }

      return {
        name: `${d.firstName} ${d.lastName}`,
        method: d.paymentMethod,
        currentFreq: d.paymentFrequency,
        computedFreq: freq,
        paymentCount: pmts.length,
        formTypes: [...new Set(pmts.map(p => p.formType).filter(Boolean))],
        dates: pmts.map(p => p.date?.toISOString().slice(0, 10)),
        reason,
      };
    });

    res.json({
      total: await prisma.donor.count(),
      mensuel: await prisma.donor.count({ where: { paymentFrequency: 'mensuel' } }),
      ponctuel: await prisma.donor.count({ where: { paymentFrequency: 'ponctuel' } }),
      sample: rows,
    });
  } catch (err) {
    next(err);
  }
};

export const classifyDonors = async (req, res, next) => {
  try {
    await classifyAndRefreshAll();
    const [mensuel, ponctuel] = await Promise.all([
      prisma.donor.count({ where: { paymentFrequency: 'mensuel' } }),
      prisma.donor.count({ where: { paymentFrequency: 'ponctuel' } }),
    ]);
    res.json({ mensuel, ponctuel });
  } catch (err) {
    next(err);
  }
};

export const simulateStatuses = async (req, res, next) => {
  try {
    const asOf = req.query.asOf ? new Date(req.query.asOf) : new Date();
    if (isNaN(asOf)) return res.status(400).json({ error: 'Date invalide' });

    const donors = await prisma.donor.findMany({ include: { pole: true } });

    const rows = donors.map(d => {
      const { status: simulated, delayMonths } = computeStatus(d, asOf);
      return {
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        pole: d.pole?.name ?? '—',
        lastPayment: d.lastPayment ? d.lastPayment.toISOString().slice(0, 10) : null,
        currentStatus: d.status,
        simulatedStatus: simulated,
        delayMonths,
        willChange: d.status !== simulated && d.status !== 'ARRETE',
      };
    });

    res.json({
      asOf: asOf.toISOString().slice(0, 10),
      summary: {
        actif:   rows.filter(r => r.simulatedStatus === 'ACTIF').length,
        retard:  rows.filter(r => r.simulatedStatus === 'RETARD').length,
        arrete:  rows.filter(r => r.simulatedStatus === 'ARRETE').length,
        changes: rows.filter(r => r.willChange).length,
      },
      donors: rows,
    });
  } catch (err) {
    next(err);
  }
};

export const refreshAllStatuses = async (req, res, next) => {
  try {
    const donors = await prisma.donor.findMany();
    let updated = 0;
    for (const d of donors) {
      await refreshDonorStatus(prisma, d.id);
      updated++;
    }
    res.json({ updated });
  } catch (err) {
    next(err);
  }
};

export const diagnostic = async (req, res, next) => {
  try {
    const [haPayments, haMembers] = await Promise.all([getPayments(), getMembers()]);
    const [dbDonors, dbPayments] = await Promise.all([
      prisma.donor.findMany({ include: { payments: true, pole: true } }),
      prisma.payment.findMany(),
    ]);

    // Clé composite email+pôle pour détecter les donateurs manquants par pôle
    const dbEmailPoleKeys = new Set(dbDonors.map(d => `${d.email}__${d.pole?.name ?? ''}`));
    const dbHelloassoIds  = new Set(dbPayments.map(p => p.helloassoId).filter(Boolean));

    // 1. Membres HelloAsso absents de la DB (par paire email+formulaire)
    const missingDonors = haMembers
      .filter(m => {
        const email    = (m.user ?? m.payer)?.email;
        const formName = (m.membership?.membershipFormName ?? m.order?.formName ?? '').trim();
        return email && !dbEmailPoleKeys.has(`${email}__${formName}`);
      })
      .map(m => {
        const u = m.user ?? m.payer ?? {};
        return {
          email:    u.email,
          name:     `${u.firstName} ${u.lastName}`,
          formName: (m.membership?.membershipFormName ?? m.order?.formName ?? '').trim(),
        };
      });

    // 2. Paiements HelloAsso absents de la DB
    const missingPayments = haPayments
      .filter(p => !dbHelloassoIds.has(String(p.id)))
      .map(p => ({ id: p.id, email: p.payer?.email, amount: p.amount / 100, date: p.date, state: p.state }));

    // 3. Donateurs avec amount=0
    const zeroAmount = dbDonors
      .filter(d => d.amount === 0)
      .map(d => ({ id: d.id, name: `${d.firstName} ${d.lastName}`, email: d.email, paymentsCount: d.payments.length }));

    // 4. Statuts incohérents (DB vs recalcul)
    const wrongStatus = dbDonors
      .filter(d => {
        const { status } = computeStatus(d);
        return status !== d.status && d.status !== 'ARRETE';
      })
      .map(d => {
        const { status: expected } = computeStatus(d);
        return { id: d.id, name: `${d.firstName} ${d.lastName}`, current: d.status, expected, lastPayment: d.lastPayment };
      });

    // 5. Paiements en doublon potentiel (même email, même montant, même date)
    const haPaymentKeys = haPayments.map(p => `${p.payer?.email}_${p.amount}_${p.date?.split('T')[0]}`);
    const dupes = haPaymentKeys.filter((k, i) => haPaymentKeys.indexOf(k) !== i).length;

    res.json({
      helloasso: { members: haMembers.length, payments: haPayments.length },
      database:  { donors: dbDonors.length, payments: dbPayments.length },
      issues: {
        missingDonors:   { count: missingDonors.length,  items: missingDonors.slice(0, 20) },
        missingPayments: { count: missingPayments.length, items: missingPayments.slice(0, 20) },
        zeroAmount:      { count: zeroAmount.length,      items: zeroAmount.slice(0, 20) },
        wrongStatus:     { count: wrongStatus.length,     items: wrongStatus.slice(0, 20) },
        duplicatePayments: dupes,
      },
    });
  } catch (err) {
    logger.error('[HelloAsso diagnostic]', err.message);
    next(err);
  }
};

// Sync HelloAsso form states → update Pole.helloassoState
// Called automatically at end of syncPayments; also exposed as standalone route.
async function syncFormStates() {
  let forms;
  try {
    forms = await getForms();
  } catch (err) {
    logger.warn('[HelloAsso syncFormStates] getForms failed:', err.message);
    return { updated: 0 };
  }
  if (!forms.length) return { updated: 0 };

  let updated = 0;
  for (const form of forms) {
    const title = (form.title ?? '').trim();
    const state = form.state ?? 'Public';
    if (!title) continue;
    const result = await prisma.pole.updateMany({
      where: { name: title },
      data: { helloassoState: state },
    });
    updated += result.count;
  }
  logger.info(`[HelloAsso] syncFormStates — ${forms.length} forms → ${updated} poles updated`);
  return { updated };
}

export const syncForms = async (req, res, next) => {
  try {
    const result = await syncFormStates();
    const poles  = await prisma.pole.findMany({ select: { name: true, helloassoState: true } });
    res.json({ ...result, poles });
  } catch (err) {
    next(err);
  }
};

export const resetData = async (req, res, next) => {
  try {
    await prisma.activityLog.deleteMany();
    await prisma.relance.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.envoiItem.deleteMany();
    await prisma.envoi.deleteMany();
    await prisma.donor.deleteMany();
    await prisma.pole.deleteMany();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
