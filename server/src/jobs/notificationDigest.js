const db = require("../db");
const config = require("../config/env");
const { sendEmail } = require("../utils/email");
const { computeDesired } = require("../controllers/notificationsController");

// Only these roles ever receive notifications in the app (see
// notificationsController.computeDesired) — no point emailing anyone else.
const NOTIFIABLE_ROLES = ["pasteur", "pr", "leader", "encadreur", "leader_cellule"];

function digestEmailHtml(notifications) {
  const items = notifications
    .map(
      (n) => `
        <li style="margin-bottom:10px;">
          <strong>${n.title}</strong><br/>
          <span style="color:#555;">${n.message || ""}</span>
          ${n.link ? `<br/><a href="${config.appUrl}${n.link}">Voir dans l'application</a>` : ""}
        </li>`
    )
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Vous avez ${notifications.length} notification(s) en attente</h2>
      <ul style="padding-left: 18px;">${items}</ul>
      <p style="margin-top:16px;">
        <a href="${config.appUrl}/notifications" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;
           text-decoration:none;border-radius:8px;">Ouvrir mes notifications</a>
      </p>
    </div>
  `;
}

// Recalcule et envoie, pour chaque compte concerné, un email récapitulatif
// des notifications non lues — appelé par le planificateur (voir scheduler.js)
// 3 fois par semaine. Ne fait rien pour un utilisateur qui n'a aucune
// notification non lue au moment de l'exécution.
async function runNotificationDigest() {
  const users = await db.users.listAllActive();
  const targets = users.filter((u) => NOTIFIABLE_ROLES.includes(u.role) && u.email);

  let sent = 0;
  for (const u of targets) {
    try {
      const desired = await computeDesired({ sub: u.id, role: u.role, departmentId: u.departmentId });
      await db.notifications.reconcile(u.id, desired);

      const all = await db.notifications.list(u.id);
      const unread = all.filter((n) => !n.isRead);
      if (!unread.length) continue;

      await sendEmail({
        to: u.email,
        subject: `[SSA] ${unread.length} notification(s) en attente`,
        html: digestEmailHtml(unread),
      });
      sent += 1;
    } catch (error) {
      // Un échec pour une personne ne doit jamais bloquer les autres.
      // eslint-disable-next-line no-console
      console.error(`[notification-digest] échec pour ${u.email}:`, error.message);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[notification-digest] terminé — ${sent}/${targets.length} email(s) envoyé(s).`);
  return { checked: targets.length, sent };
}

module.exports = { runNotificationDigest, digestEmailHtml };