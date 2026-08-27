// Lance le digest de notifications (email + push) une seule fois, pour
// tester manuellement sans attendre le prochain créneau du planificateur
// (lun/mer/ven 18h — voir scheduler.js). Usage : npm run digest:test
const db = require("../db");
const { runNotificationDigest } = require("./notificationDigest");

async function main() {
  await db.init();
  const result = await runNotificationDigest();
  console.log(result); // eslint-disable-line no-console
}

main()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Échec du digest:", error); // eslint-disable-line no-console
    process.exit(1);
  });
