import prisma from '../config/database.js';

const DEFAULTS = {
  retard_threshold_days: '35',
  due_day: '15',
  auto_arrete_months: '12',
  notif_enabled:     'false',
  notif_test_phone:  '',
  notif_test_email:  '',
  whatsapp_template: '',
};

async function getConfig(key) {
  const row = await prisma.config.findUnique({ where: { key } });
  return row ? row.value : DEFAULTS[key] ?? null;
}

async function setConfig(key, value) {
  await prisma.config.upsert({
    where:  { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

export const getSettings = async (req, res, next) => {
  try {
    const [threshold, dueDay, autoArreteMonths, notifEnabled, testPhone, testEmail, waTemplate] =
      await Promise.all([
        getConfig('retard_threshold_days'),
        getConfig('due_day'),
        getConfig('auto_arrete_months'),
        getConfig('notif_enabled'),
        getConfig('notif_test_phone'),
        getConfig('notif_test_email'),
        getConfig('whatsapp_template'),
      ]);
    res.json({
      retardThresholdDays: parseInt(threshold, 10),
      dueDay:              parseInt(dueDay, 10),
      autoArreteMonths:    parseInt(autoArreteMonths, 10),
      notifEnabled:        notifEnabled === 'true',
      testPhone:           testPhone ?? '',
      testEmail:           testEmail ?? '',
      whatsappTemplate:    waTemplate ?? '',
    });
  } catch (err) { next(err); }
};

export const saveSettings = async (req, res, next) => {
  try {
    const { retardThresholdDays, dueDay, autoArreteMonths,
            notifEnabled, testPhone, testEmail, whatsappTemplate } = req.body;

    if (retardThresholdDays !== undefined) await setConfig('retard_threshold_days', retardThresholdDays);
    if (dueDay              !== undefined) await setConfig('due_day', dueDay);
    if (autoArreteMonths    !== undefined) await setConfig('auto_arrete_months', autoArreteMonths);
    if (notifEnabled        !== undefined) await setConfig('notif_enabled', notifEnabled ? 'true' : 'false');
    if (testPhone           !== undefined) await setConfig('notif_test_phone', testPhone);
    if (testEmail           !== undefined) await setConfig('notif_test_email', testEmail);
    if (whatsappTemplate    !== undefined) await setConfig('whatsapp_template', whatsappTemplate);

    res.json({ ok: true });
  } catch (err) { next(err); }
};

export async function getDueDay() {
  return parseInt(await getConfig('due_day'), 10);
}

export async function getAutoArreteMonths() {
  return parseInt(await getConfig('auto_arrete_months'), 10);
}

export { getConfig };


