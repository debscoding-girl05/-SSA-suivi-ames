const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dsId = process.env.NOTION_DATABASE_ID;

// Titre exact → nouveau statut.
const UPDATES = new Map([
  ["[M1] Modèle 6 rôles (Pasteur/PR/Leader/Encadreur/Leader cellule) + matrice droits", "Terminé"],
  ["[M1] Login par email OU téléphone + blocage après 5 tentatives", "Terminé"],
  // Partiel: bcrypt 12 fait; politique MDP + session 30min + refresh token à venir.
  ["[M1] Durcissement auth: bcrypt coût ≥12, politique MDP, session 30 min + refresh token", "En cours"],
  // Partiel: 13 départements seedés; arborescence UI à venir.
  ["[M2] Seed des 13 départements officiels + arborescence dépt→leaders→encadreurs→membres", "En cours"],
]);

async function main() {
  const results = [];
  let cursor;
  do {
    const r = await notion.dataSources.query({ data_source_id: dsId, start_cursor: cursor });
    results.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  for (const page of results) {
    const title = page.properties["Tâche"]?.title?.[0]?.plain_text || "";
    if (!UPDATES.has(title)) continue;
    const statut = UPDATES.get(title);
    try {
      await notion.pages.update({
        page_id: page.id,
        properties: { Statut: { select: { name: statut } } },
      });
      console.log(`✓ ${statut} — ${title}`);
    } catch (e) {
      console.error(`✗ ${title}: ${e.message}`);
    }
  }
}

main().catch((e) => console.error(e.message));
