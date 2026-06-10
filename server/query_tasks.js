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
      filter: {
        and: [
          {
            property: 'Sprint',
            select: {
              equals: 'Sprint 0'
            }
          },
          {
            or: [
              {
                property: 'Développeur',
                select: {
                  equals: 'Dev C – Full-stack'
                }
              },
              {
                property: 'Développeur',
                select: {
                  equals: 'Dev B – Frontend'
                }
              }
            ]
          }
        ]
      },
      start_cursor: cursor
    });

    results.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor;
  }

  const formatted = results.map(page => {
    const props = page.properties;
    return {
      id: page.id,
      Tâche: props['Tâche']?.title?.[0]?.plain_text || '',
      Statut: props['Statut']?.status?.name || props['Statut']?.select?.name || '',
      Développeur: props['Développeur']?.select?.name || props['Développeur']?.multi_select?.map(s => s.name).join(', ') || '',
      Catégorie: props['Catégorie']?.select?.name || props['Catégorie']?.multi_select?.map(s => s.name).join(', ') || '',
      Priorité: props['Priorité']?.select?.name || '',
      Notes: props['Notes']?.rich_text?.[0]?.plain_text || ''
    };
  });

  console.log(JSON.stringify(formatted, null, 2));
}

main().catch(console.error);
