import prisma from '../config/database.js';

const DEFAULTS = {
  retard_threshold_days: '35',
  due_day: '15',
};

async function getConfig(key) {
  const row = await prisma.config.findUnique({ where: { key } });
  return row ? row.value : DEFAULTS[key] ?? null;
}

export const getSettings = async (req, res, next) => {
  try {
    const [threshold, dueDay] = await Promise.all([
      getConfig('retard_threshold_days'),
      getConfig('due_day'),
    ]);
    res.json({
      retardThresholdDays: parseInt(threshold, 10),
      dueDay: parseInt(dueDay, 10),
    });
  } catch (err) {
    next(err);
  }
};

export const saveSettings = async (req, res, next) => {
  try {
    const { retardThresholdDays, dueDay } = req.body;

    if (retardThresholdDays !== undefined) {
      await prisma.config.upsert({
        where: { key: 'retard_threshold_days' },
        update: { value: String(retardThresholdDays) },
        create: { key: 'retard_threshold_days', value: String(retardThresholdDays) },
      });
    }
    if (dueDay !== undefined) {
      await prisma.config.upsert({
        where: { key: 'due_day' },
        update: { value: String(dueDay) },
        create: { key: 'due_day', value: String(dueDay) },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export async function getDueDay() {
  const val = await getConfig('due_day');
  return parseInt(val, 10);
}
