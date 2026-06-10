const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function main() {
  const response = await notion.search({
    filter: { property: 'object', value: 'database' }
  });
  console.log(JSON.stringify(response.results.map(db => ({ id: db.id, title: db.title[0]?.plain_text })), null, 2));
}

main().catch(console.error);
