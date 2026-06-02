const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function main() {
  const dataSourceId = process.env.NOTION_DATABASE_ID;
  const results = [];
  let hasMore = true;
  let cursor = undefined;

  while (hasMore) {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
    });
    results.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor;
  }

  const formatted = results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      Tache: props["Tâche"]?.title?.[0]?.plain_text || "",
      Sprint: props["Sprint"]?.select?.name || "",
      Statut: props["Statut"]?.status?.name || props["Statut"]?.select?.name || "",
      Developpeur: props["Développeur"]?.select?.name || "",
      Categorie: props["Catégorie"]?.select?.name || "",
      Priorite: props["Priorité"]?.select?.name || "",
      Notes: props["Notes"]?.rich_text?.[0]?.plain_text || "",
    };
  });

  // Group by sprint
  const bySprint = {};
  for (const t of formatted) {
    const s = t.Sprint || "(no sprint)";
    bySprint[s] = bySprint[s] || [];
    bySprint[s].push(t);
  }

  for (const sprint of Object.keys(bySprint).sort()) {
    console.log(`\n========== ${sprint} (${bySprint[sprint].length}) ==========`);
    for (const t of bySprint[sprint]) {
      console.log(`[${t.Statut}] (${t.Priorite}) ${t.Tache} — ${t.Developpeur} / ${t.Categorie}`);
    }
  }
}

main().catch(console.error);
