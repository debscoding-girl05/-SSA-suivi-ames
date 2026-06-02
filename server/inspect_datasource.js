const { Client } = require("@notionhq/client");
require("dotenv").config({ path: "../.env" });

async function main() {
  const notion = new Client({ 
    auth: process.env.NOTION_TOKEN || process.env.NOTION_KEY || process.env.NOTION_INTERNAL_TOKEN 
  });

  const dataSourceId = 'ef187513-8c51-4d69-8756-124f944ebb46';
  console.log(`Retrieving Data Source: ${dataSourceId}`);

  try {
    if (typeof notion.dataSources === 'undefined') {
        throw new Error("notion.dataSources is not supported by this version of the Notion SDK.");
    }
    
    const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
    
    const properties = dataSource.properties || {};
    console.log("\nProperty Names:");
    Object.keys(properties).forEach(name => console.log(`- ${name}`));

    const devProp = properties['Développeur'];
    if (devProp) {
      const options = (devProp.select || devProp.multi_select)?.options;
      if (options) {
        console.log(`\nSelect options for 'Développeur':`);
        options.forEach(opt => console.log(`- ${opt.name}`));
      } else {
        console.log("\n'Développeur' property found but has no select/multi_select options.");
      }
    } else {
      console.log("\n'Développeur' property not found.");
    }
  } catch (e) {
    console.error("\nError:", e.message);
    
    // Troubleshooting: show what's available
    if (e.message.includes("not supported")) {
        console.log("Available namespaces on notion client:", Object.keys(notion).filter(k => typeof notion[k] === 'object' && notion[k] !== null));
    }
  }
}

main();
