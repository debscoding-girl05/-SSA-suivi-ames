const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function main() {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const response = await notion.databases.retrieve({ database_id: databaseId });
  console.log(JSON.stringify(response.properties, null, 2));
}

main().catch(console.error);
