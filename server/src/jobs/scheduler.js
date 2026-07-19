const cron = require("node-cron");
const config = require("../config/env");
const { runNotificationDigest } = require("./notificationDigest");

// 3x/semaine (lundi, mercredi, vendredi à 18h, heure du Cameroun) — un rappel
// groupé pour rattraper une notification manquée en semaine, sans spammer
// tous les jours. Modifiable ici si le rythme doit changer.
const CRON_EXPRESSION = "0 18 * * 1,3,5";
const TIMEZONE = "Africa/Douala";

function startScheduler() {
  cron.schedule(
    CRON_EXPRESSION,
    () => {
      runNotificationDigest().catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[scheduler] échec du digest de notifications:", error);
      });
    },
    { timezone: TIMEZONE }
  );

  // eslint-disable-next-line no-console
  console.log(`  Digest   : lun/mer/ven 18h00 (${TIMEZONE})`);
}

module.exports = { startScheduler, CRON_EXPRESSION, TIMEZONE };