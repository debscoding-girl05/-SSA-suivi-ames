const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dataSourceId = process.env.NOTION_DATABASE_ID;

// Sprint 1 tasks fully delivered by the auth + members vertical slice.
const DONE_TITLES = new Set([
  "Page de connexion mobile-first (ultra-simple)",
  "Store auth (Context API ou Zustand)",
  "Protected routes par rôle (PrivateRoute HOC)",
  "Hash passwords avec bcrypt",
  "CRUD membres complet (GET, POST, PUT, DELETE)",
  "Endpoints GET /members avec filtres par rôle",
  "Gestion des rôles RBAC (middleware permissions)",
  "Liste membres responsive (mobile + desktop)",
  "Formulaire ajout / édition membre",
  "Migrations DB membres + départements",
  "Seed data — données de test réalistes",
]);

async function main() {
  const results = [];
  let cursor;
  do {
    const r = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Sprint", select: { equals: "Sprint 1" } },
      start_cursor: cursor,
    });
    results.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  for (const page of results) {
    const title = page.properties["Tâche"]?.title?.[0]?.plain_text || "";
    if (!DONE_TITLES.has(title)) continue;
    try {
      await notion.pages.update({
        page_id: page.id,
        properties: { Statut: { select: { name: "Terminé" } } },
      });
      console.log(`✓ Terminé — ${title}`);
    } catch (e) {
      console.error(`✗ Échec — ${title}: ${e.message}`);
    }
  }
}

main().catch((e) => console.error(e.message));
