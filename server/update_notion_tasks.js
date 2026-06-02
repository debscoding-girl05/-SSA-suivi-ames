const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '../.env' });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const taskIds = [
  '35ff6d3e-f2af-8104-8902-f983c1fe2d00',
  '35ff6d3e-f2af-8120-8775-c1a7ae300395',
  '35ff6d3e-f2af-8163-a4ed-ca3c1bbea796',
  '35ff6d3e-f2af-818e-a0c0-db3b935dc730',
  '35ff6d3e-f2af-81af-8894-c63ddc76e245',
  '35ff6d3e-f2af-81d6-9c7f-ebfcb2872a0d',
  '35ff6d3e-f2af-81e5-b699-c06bf9c9a964',
  '35ff6d3e-f2af-81e8-8e71-c5b4aaecd724'
];

async function updateTasks() {
  for (const pageId of taskIds) {
    try {
      await notion.pages.update({
        page_id: pageId,
        properties: {
          'Statut': {
            select: {
              name: 'Terminé'
            }
          }
        }
      });
      console.log(`Successfully updated page: ${pageId}`);
    } catch (error) {
      console.error(`Failed to update page: ${pageId}. Error: ${error.message}`);
    }
  }
}

updateTasks();
