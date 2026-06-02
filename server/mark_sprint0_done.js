const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Sprint 0 backend foundation tasks completed on feature/sprint0-setup.
const tasks = [
  { id: "35ff6d3e-f2af-8121-960f-c9ff2b1b5df5", title: "Setup Node.js + Express + structure serveur" },
  { id: "35ff6d3e-f2af-815a-986b-f8c17772ed7f", title: "Schéma DB v1 (users, roles, tables de base)" },
  { id: "35ff6d3e-f2af-816d-94af-de4ed1471d2e", title: "Config Supabase / PostgreSQL + connexion DB" },
  { id: "35ff6d3e-f2af-81b2-84c2-f180306b5ea3", title: "Init repo Git + branches (main, dev, feature/*)" },
  { id: "35ff6d3e-f2af-81e9-a594-f3eb9f1ca166", title: "JWT Auth middleware (vérification token)" },
];

async function main() {
  for (const task of tasks) {
    try {
      await notion.pages.update({
        page_id: task.id,
        properties: { Statut: { select: { name: "Terminé" } } },
      });
      console.log(`✓ Terminé — ${task.title}`);
    } catch (error) {
      console.error(`✗ Échec — ${task.title}: ${error.message}`);
    }
  }
}

main().catch((e) => console.error(e.message));
