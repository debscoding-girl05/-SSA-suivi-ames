const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function main() {
  const dataSourceId = process.env.NOTION_DATABASE_ID;
  const results = [];
  let hasMore = true;
  let cursor = undefined;
  while (hasMore) {
    const r = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Sprint", select: { equals: "Sprint 0" } },
      start_cursor: cursor,
    });
    results.push(...r.results);
    hasMore = r.has_more;
    cursor = r.next_cursor;
  }

  const targets = [
    "Setup Node.js + Express + structure serveur",
    "Schéma DB v1 (users, roles, tables de base)",
    "Config Supabase / PostgreSQL + connexion DB",
    "JWT Auth middleware (vérification token)",
    "Init repo Git + branches (main, dev, feature/*)",
  ];

  for (const page of results) {
    const title = page.properties["Tâche"]?.title?.[0]?.plain_text || "";
    if (!targets.includes(title)) continue;
    const statut = page.properties["Statut"];
    console.log(`${page.id} | type=${statut?.type} | current=${statut?.status?.name || statut?.select?.name} | ${title}`);
  }
}

main().catch((e) => console.error(e.message));
