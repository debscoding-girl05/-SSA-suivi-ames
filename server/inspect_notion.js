const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN || process.env.NOTION_KEY || process.env.NOTION_INTERNAL_TOKEN });

async function main() {
  const databaseId = 'c3968086-31b9-4b43-8155-db7a6a2505b8';
  console.log(`--- Retrieving Database: ${databaseId} ---`);
  try {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    console.log("Top-level keys:", Object.keys(db));
    console.log("Full DB Object:", JSON.stringify(db, null, 2));
    
    // Check for specific fields
    const fieldsToWatch = ['parent', 'data_sources', 'is_inline'];
    fieldsToWatch.forEach(f => {
      if (db[f]) console.log(`${f}:`, JSON.stringify(db[f], null, 2));
    });
  } catch (e) {
    console.error("Database retrieve failed:", e.message);
  }

  console.log("\n--- Searching for 'Tâches SSA' ---");
  try {
    const searchResult = await notion.search({
      query: 'Tâches SSA',
      page_size: 20,
    });
    
    console.log(`Found ${searchResult.results.length} results.`);
    searchResult.results.forEach((res, i) => {
      console.log(`\nResult ${i + 1} (${res.object}):`);
      console.log(`ID: ${res.id}`);
      if (res.object === 'database') {
          console.log(`Title: ${res.title?.[0]?.plain_text || 'N/A'}`);
      } else if (res.object === 'page') {
          const titleProp = Object.values(res.properties || {}).find(p => p.type === 'title');
          console.log(`Title: ${titleProp?.title?.[0]?.plain_text || 'N/A'}`);
      }
      
      // Look for data_source or related info in search result
      if (res.data_source) {
          console.log("Data Source info:", JSON.stringify(res.data_source, null, 2));
      }
    });

    // Check if any result has a parent that looks like a data source
  } catch (e) {
    console.error("Search failed:", e.message);
  }
}

main();
