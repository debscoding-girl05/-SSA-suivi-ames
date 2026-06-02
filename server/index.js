const config = require("./src/config/env");
const createApp = require("./src/app");
const db = require("./src/db");
const { seed } = require("./src/db/seed");

async function start() {
  // Ensure the schema exists (Postgres) or the memory store is ready.
  await db.init();

  // Seed demo data outside production so the "first view" works immediately.
  if (!config.isProduction) {
    await seed({ silent: true });
  }

  const app = createApp();

  const server = app.listen(config.port, () => {
    /* eslint-disable no-console */
    console.log(`SSA API démarrée sur http://localhost:${config.port}`);
    console.log(`  Env      : ${config.nodeEnv}`);
    console.log(`  DB       : ${db.isPostgres ? "postgres" : "in-memory (dev fallback)"}`);
    console.log(`  CORS     : ${config.corsOrigin}`);
    if (!config.isProduction) {
      console.log("  Demo     : admin@ssa.app / admin1234");
    }
    /* eslint-enable no-console */
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} reçu, arrêt en cours...`); // eslint-disable-line no-console
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Échec du démarrage du serveur:", error); // eslint-disable-line no-console
  process.exit(1);
});
