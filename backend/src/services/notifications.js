import nodemailer from 'nodemailer';

// ── Email transporter ──────────────────────────────────────────────────────
const transporter = process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

// ── Templates ──────────────────────────────────────────────────────────────
function buildEmailHtml(donor) {
  const pole   = typeof donor.pole === 'object' ? donor.pole?.name : donor.pole;
  const amount = donor.amount ?? '?';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Georgia, serif; background: #f9f7f4; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #1a5276, #2ecc71); padding: 36px 32px 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,.85); margin: 6px 0 0; font-size: 13px; }
    .arabic { text-align: center; font-size: 22px; color: #1a5276; padding: 20px 32px 0; direction: rtl; }
    .body { padding: 24px 32px 32px; color: #333; line-height: 1.75; font-size: 15px; }
    .body p { margin: 0 0 14px; }
    .hadith { background: #f0faf5; border-left: 4px solid #2ecc71; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 18px 0; font-style: italic; color: #1a5276; }
    .cta { text-align: center; margin: 28px 0; }
    .cta a { background: #2ecc71; color: #fff; padding: 13px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; }
    .footer { background: #f4f4f4; padding: 18px 32px; text-align: center; font-size: 12px; color: #888; }
    .footer strong { color: #1a5276; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Humanit'R — Association</h1>
      <p>Au service de notre communauté</p>
    </div>
    <div class="arabic">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
    <div class="body">
      <p>Assalamou Alaikoum wa rahmatullahi wa barakatuh cher(e) <strong>${donor.firstName}</strong>,</p>

      <p>Nous espérons, insh'Allah, que vous et votre famille vous portez bien.</p>

      <p>Nous nous permettons de vous contacter au sujet de votre don mensuel de <strong>${amount} €</strong> pour le projet <strong>"${pole}"</strong>. Il semble que le prélèvement de ce mois-ci n'ait pas pu être effectué — carte expirée, changement de compte ou simple oubli, cela arrive et nous le comprenons tout à fait.</p>

      <div class="hadith">
        Le Prophète ﷺ a dit : <em>« La sadaqa n'a jamais diminué un bien. »</em><br/>
        <span style="font-size:13px;color:#555">(Sahih Muslim)</span>
      </div>

      <p>Votre soutien est une sadaqa précieuse qui aide concrètement nos frères et sœurs dans le besoin. Vous pouvez régulariser votre situation directement sur HelloAsso en quelques clics :</p>

      <div class="cta">
        <a href="https://www.helloasso.com/associations/humanit-r" target="_blank">Régulariser mon don</a>
      </div>

      <p>Si vous traversez une période de difficultés, n'hésitez pas à nous contacter directement — nous trouverons ensemble la meilleure solution, insh'Allah.</p>

      <p>Qu'Allah vous récompense du bien pour votre générosité et qu'Il bénisse vos biens et votre famille.</p>

      <p>Wa assalamou alaikoum wa rahmatullahi wa barakatuh,<br/>
      <strong>L'équipe Humanit'R — Pôle Trésorerie</strong></p>
    </div>
    <div class="footer">
      <strong>Humanit'R</strong> · Association loi 1901<br/>
      Pour vous désabonner ou modifier votre don, contactez-nous directement.
    </div>
  </div>
</body>
</html>`;
}

function buildWhatsAppMsg(donor) {
  const pole   = typeof donor.pole === 'object' ? donor.pole?.name : donor.pole;
  const amount = donor.amount ?? '?';
  return (
    `Assalamou Alaikoum ${donor.firstName} 🤲\n\n` +
    `Votre don mensuel de ${amount} € pour le projet "${pole}" (Humanit'R) n'a pas pu être traité ce mois-ci.\n\n` +
    `"La sadaqa n'a jamais diminué un bien." — Sahih Muslim\n\n` +
    `Vous pouvez régulariser sur HelloAsso ou nous répondre directement insh'Allah.\n\n` +
    `Qu'Allah vous récompense — Humanit'R Trésorerie 🌙`
  );
}

// ── Envoi email ────────────────────────────────────────────────────────────
export async function sendRetardEmail(donor) {
  const to = process.env.NOTIFY_TEST_EMAIL ?? donor.email;
  if (!transporter || !to) {
    console.log(`[notif/email] mock → ${donor.firstName} ${donor.lastName} <${to}>`);
    return;
  }
  await transporter.sendMail({
    from: `"Humanit'R" <${process.env.SMTP_USER}>`,
    to,
    subject: `Un message de Humanit'R — ${donor.firstName}`,
    html: buildEmailHtml(donor),
  });
  console.log(`[notif/email] envoyé → ${to}`);
}

// ── Envoi WhatsApp via Baileys (WhatsApp Web — gratuit, illimité) ──────────
export async function sendRetardWhatsApp(donor) {
  const rawPhone = process.env.NOTIFY_TEST_PHONE ?? donor.phone;
  const phone    = rawPhone?.replace(/\D/g, '');

  if (!phone) {
    console.log(`[notif/whatsapp] skip — pas de numéro pour ${donor.firstName} ${donor.lastName}`);
    return;
  }

  const { sendWhatsAppMessage, getWhatsAppStatus } = await import('./whatsapp.js');
  const { state } = getWhatsAppStatus();

  if (state !== 'connected') {
    console.log(`[notif/whatsapp] WhatsApp non connecté (${state}) — message non envoyé`);
    return;
  }

  await sendWhatsAppMessage(phone, buildWhatsAppMsg(donor));
  console.log(`[notif/whatsapp] envoyé → +${phone}`);
}

// ── Notification complète (email + WhatsApp) ───────────────────────────────
export async function sendRetardNotification(donor) {
  const results = await Promise.allSettled([
    sendRetardEmail(donor),
    sendRetardWhatsApp(donor),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[notif] Erreur:', r.reason?.message ?? r.reason);
  }
}
