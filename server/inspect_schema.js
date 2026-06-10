const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function main() {
  const dsId = process.env.NOTION_DATABASE_ID;
  // Retrieve the data source to read its property schema.
  let ds;
  try {
    ds = await notion.dataSources.retrieve({ data_source_id: dsId });
  } catch (e) {
    console.log("dataSources.retrieve failed:", e.message);
  }
  if (ds && ds.properties) {
    console.log("=== PROPERTIES ===");
    for (const [name, prop] of Object.entries(ds.properties)) {
      let opts = "";
      if (prop.type === "select") opts = " options: " + prop.select.options.map((o) => o.name).join(" | ");
      if (prop.type === "status") opts = " options: " + prop.status.options.map((o) => o.name).join(" | ");
      if (prop.type === "multi_select") opts = " options: " + prop.multi_select.options.map((o) => o.name).join(" | ");
      console.log(`- ${name} [${prop.type}]${opts}`);
    }
  }

  // Count existing tasks by sprint.
  const results = [];
  let cursor;
  do {
    const r = await notion.dataSources.query({ data_source_id: dsId, start_cursor: cursor });
    results.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  const bySprint = {};
  for (const p of results) {
    const s = p.properties["Sprint"]?.select?.name || "(none)";
    bySprint[s] = (bySprint[s] || 0) + 1;
  }
  console.log("\n=== EXISTING TASKS BY SPRINT (total " + results.length + ") ===");
  for (const [s, n] of Object.entries(bySprint)) console.log(`- ${s}: ${n}`);
}

main().catch((e) => console.error(e.message));
