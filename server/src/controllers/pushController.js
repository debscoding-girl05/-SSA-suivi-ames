const db = require("../db");
const ApiError = require("../utils/ApiError");
const push = require("../utils/push");

// GET /api/push/public-key — public, needed by the browser before subscribing.
function publicKey(_req, res) {
  res.json({ publicKey: push.vapidPublicKey, configured: push.configured });
}

// POST /api/push/subscribe — body: the PushSubscription object from
// navigator.serviceWorker.ready.pushManager.subscribe(...).
async function subscribe(req, res) {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw ApiError.badRequest("Abonnement push invalide.");
  }
  await db.pushSubscriptions.upsert({ userId: req.user.sub, endpoint, p256dh: keys.p256dh, auth: keys.auth });
  res.status(201).json({ ok: true });
}

// POST /api/push/unsubscribe — body: { endpoint }.
async function unsubscribe(req, res) {
  const { endpoint } = req.body || {};
  if (!endpoint) throw ApiError.badRequest("endpoint requis.");
  await db.pushSubscriptions.remove(endpoint);
  res.status(204).end();
}

module.exports = { publicKey, subscribe, unsubscribe };
