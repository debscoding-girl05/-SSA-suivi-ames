const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN || process.env.NOTION_KEY || process.env.NOTION_INTERNAL_TOKEN });

const ids = [
  "8c5f6d3ef2af8256a63781613b44922a",
  "35ff6d3ef2af8192931aec2192ffde22",
  "365f6d3ef2af810ea855ca8f2eb0f83f",
  "c396808631b94b438155db7a6a2505b8"
];

function normalizeId(id) {
  if (id.includes("-")) return id;
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

async function testId(id) {
  const normalizedId = normalizeId(id);
  console.log(`\nTesting ID: ${id} (normalized: ${normalizedId})`);

  // Test Pages
  try {
    const page = await notion.pages.retrieve({ page_id: normalizedId });
    let title = "Unknown";
    if (page.properties) {
      const titleProp = Object.values(page.properties).find(p => p.type === 'title');
      if (titleProp && titleProp.title && titleProp.title[0]) {
        title = titleProp.title[0].plain_text;
      }
    }
    console.log(`- Page: SUCCESS (Title: ${title})`);
  } catch (e) {
    console.log(`- Page: FAILED (${e.code || e.message})`);
  }

  // Test Databases
  try {
    const db = await notion.databases.retrieve({ database_id: normalizedId });
    let name = "Unknown";
    if (db.title && db.title[0]) {
      name = db.title[0].plain_text;
    }
    console.log(`- Database: SUCCESS (Name: ${name})`);
  } catch (e) {
    console.log(`- Database: FAILED (${e.code || e.message})`);
  }

  // Test DataSources
  // Note: Notion Node SDK might not have dataSources yet depends on version,
  // but the prompt asked for it. If not in SDK, we'll try a manual request if needed.
  // Actually, checking @notionhq/client docs/types.
  if (notion.dataSources && notion.dataSources.retrieve) {
    try {
      const ds = await notion.dataSources.retrieve({ data_source_id: normalizedId });
      console.log(`- DataSource: SUCCESS (Name: ${ds.name || 'Unknown'})`);
    } catch (e) {
      console.log(`- DataSource: FAILED (${e.code || e.message})`);
    }
  } else {
      console.log(`- DataSource: SDK does not support dataSources.retrieve`);
  }
}

async function main() {
  if (!process.env.NOTION_TOKEN && !process.env.NOTION_KEY && !process.env.NOTION_INTERNAL_TOKEN) {
    console.error("Error: No Notion token found in ../.env");
    return;
  }
  for (const id of ids) {
    await testId(id);
  }
}

main();
