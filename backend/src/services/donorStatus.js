/**
 * asOf : date de référence (défaut = aujourd'hui), utile pour la simulation.
 *
 * Règle :
 *   monthsSince(lastPayment, asOf) <= 1  → ACTIF
 *   monthsSince >= 2                     → RETARD, delayMonths = monthsSince - 1
 *
 * Exemple (asOf = 5 mai) :
 *   dernier paiement en avril → monthsSince = 1 → ACTIF (mai pas encore dû)
 *   dernier paiement en mars  → monthsSince = 2 → RETARD 1 mois (avril manqué)
 *   dernier paiement en fév   → monthsSince = 3 → RETARD 2 mois (mars + avril manqués)
 */
export const computeStatus = (donor, asOf = new Date()) => {
  if (donor.status === 'ARRETE') {
    return { status: 'ARRETE', delayMonths: donor.delayMonths ?? 0 };
  }

  // Donateur ponctuel = pas de prélèvement mensuel attendu → toujours ACTIF
  if (donor.paymentFrequency === 'ponctuel') {
    return { status: 'ACTIF', delayMonths: 0 };
  }

  const refDate = donor.lastPayment ?? donor.startDate;
  if (!refDate) {
    return { status: 'RETARD', delayMonths: 1 };
  }

  const last = new Date(refDate);
  const now  = new Date(asOf);

  const monthsSince =
    (now.getFullYear() - last.getFullYear()) * 12 +
    (now.getMonth()    - last.getMonth());

  if (monthsSince <= 1) {
    return { status: 'ACTIF', delayMonths: 0 };
  }

  return { status: 'RETARD', delayMonths: monthsSince - 1 };
};

export const refreshDonorStatus = async (prisma, donorId) => {
  const donor = await prisma.donor.findUnique({ where: { id: donorId }, include: { pole: true } });
  if (!donor) return;

  const oldStatus = donor.status;
  const { status, delayMonths } = computeStatus(donor);

  await prisma.donor.update({ where: { id: donorId }, data: { status, delayMonths } });

  if (status === 'RETARD' && oldStatus !== 'RETARD') {
    const { sendRetardNotification } = await import('./notifications.js');
    sendRetardNotification(donor).catch(err => console.error('[notif]', err.message));
  }
};
