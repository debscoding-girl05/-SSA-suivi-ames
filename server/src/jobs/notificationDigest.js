const db = require("../db");
const config = require("../config/env");
const { sendEmail } = require("../utils/email");
const { sendPushToUser } = require("../utils/push");
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

// Recalcule et envoie, pour chaque compte concerné, un rappel des
// notifications non lues (email ET/OU push, selon ce que la personne a
// configuré) — appelé par le planificateur (voir scheduler.js) 3 fois par
// semaine. Ne fait rien pour un utilisateur qui n'a aucune notification non
// lue au moment de l'exécution, ni pour un canal non configuré côté serveur
// (RESEND_API_KEY / VAPID absents — voir email.js / push.js).
async function runNotificationDigest() {
  const users = await db.users.listAllActive();
  // Ciblé par rôle uniquement : contrairement à l'email, le push ne dépend
  // pas d'avoir un email renseigné — on filtre donc par rôle seulement, et
  // chaque canal décide lui-même s'il a de quoi contacter la personne.
  const targets = users.filter((u) => NOTIFIABLE_ROLES.includes(u.role));

  let emailsSent = 0;
  let pushSent = 0;
  for (const u of targets) {
    try {
      const desired = await computeDesired({ sub: u.id, role: u.role, departmentId: u.departmentId });
      await db.notifications.reconcile(u.id, desired);

      const all = await db.notifications.list(u.id);
      const unread = all.filter((n) => !n.isRead);
      if (!unread.length) continue;

      if (u.email) {
        await sendEmail({
          to: u.email,
          subject: `[SSA] ${unread.length} notification(s) en attente`,
          html: digestEmailHtml(unread),
        });
        emailsSent += 1;
      }

      const { sent } = await sendPushToUser(u.id, {
        title: `SSA — ${unread.length} notification(s) en attente`,
        body: unread[0].title,
        url: "/notifications",
      });
      if (sent) pushSent += 1;
    } catch (error) {
      // Un échec pour une personne ne doit jamais bloquer les autres.
      // eslint-disable-next-line no-console
      console.error(`[notification-digest] échec pour ${u.email || u.id}:`, error.message);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[notification-digest] terminé — ${emailsSent} email(s), ${pushSent} push(es) envoyé(s) sur ${targets.length} compte(s).`);
  return { checked: targets.length, emailsSent, pushSent };
}

module.exports = { runNotificationDigest, digestEmailHtml };