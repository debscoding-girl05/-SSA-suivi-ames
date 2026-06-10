const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function main() {
  const response = await notion.search({
    filter: { property: 'object', value: 'data_source' }
  });
  console.log(JSON.stringify(response.results.map(ds => ({ id: ds.id, title: ds.name })), null, 2));
}

main().catch(console.error);
