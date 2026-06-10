const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function run() {
  try {
    const dataSourceId = process.env.NOTION_DATABASE_ID;
    console.log("Using Data Source ID:", dataSourceId);
    
    const response = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
    
    console.log("Property Names and Types:");
    // dataSources response structure might be different from databases.
    // Assuming it has properties if they asked to print each property name and type.
    if (response.properties) {
        for (const [name, prop] of Object.entries(response.properties)) {
          console.log(`${name}: ${prop.type}`);
        }
    } else {
        console.log("No properties found in data source response.");
        console.log("Full response:", JSON.stringify(response, null, 2));
    }
  } catch (error) {
    if (error.message.includes("is not a function")) {
        console.error("error: notion.dataSources.retrieve is not a function in this version");
    } else {
        console.error("Error:", error.message);
        if (error.body) console.error(error.body);
    }
  }
}

run();
