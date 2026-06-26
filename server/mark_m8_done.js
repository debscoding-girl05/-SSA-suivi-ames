const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dsId = process.env.NOTION_DATABASE_ID;

const TITLES = new Set([
  "[M8] Migration DB cellules de prière + rôle leader de cellule",
  "[M8] API CRUD cellules + fiche cellule + remontée au département",
  "[M8] Écrans cellules + soumission fiche cellule (leader de cellule)",
  "Création d'une cellule de prière",
]);

async function main() {
  const results = [];
  let cursor;
  do {
    const r = await notion.dataSources.query({ data_source_id: dsId, start_cursor: cursor });
    results.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  for (const p of results) {
    const t = p.properties["Tâche"]?.title?.[0]?.plain_text || "";
    if (!TITLES.has(t)) continue;
    await notion.pages.update({ page_id: p.id, properties: { Statut: { select: { name: "Terminé" } } } });
    console.log("✓ Terminé —", t);
  }
}

main().catch((e) => console.error(e.message));
