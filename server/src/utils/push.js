const webpush = require("web-push");
const config = require("../config/env");
const db = require("../db");

const configured = Boolean(config.push.vapidPublicKey && config.push.vapidPrivateKey);
if (configured) {
  webpush.setVapidDetails(config.push.vapidSubject, config.push.vapidPublicKey, config.push.vapidPrivateKey);
}

// Envoie une notification push à tous les appareils enregistrés d'un
// utilisateur. Best-effort : un échec pour un appareil (abonnement expiré,
// navigateur fermé pour de bon) ne doit jamais faire planter l'appelant —
// on nettoie juste l'abonnement mort (410/404) pour ne pas réessayer indéfiniment.
async function sendPushToUser(userId, { title, body, url }) {
  if (!configured) return { sent: 0, skipped: true };

  const subs = await db.pushSubscriptions.listByUser(userId);
  if (!subs.length) return { sent: 0, skipped: false };

  const payload = JSON.stringify({ title, body, url: url || "/notifications" });
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.pushSubscriptions.remove(sub.endpoint);
        } else {
          // eslint-disable-next-line no-console
          console.error(`[push] échec d'envoi (${err.statusCode || "?"}):`, err.message);
        }
      }
    })
  );
  return { sent, skipped: false };
}

module.exports = { sendPushToUser, configured, vapidPublicKey: config.push.vapidPublicKey };
