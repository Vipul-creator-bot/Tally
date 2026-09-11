const { XMLParser } = require('fast-xml-parser');
const { sendToTally } = require('../integration/tallyClient');
const { listOfStockItemsRequest } = require('../integration/xmlTemplates');
const { companyName, tallyUrl } = require('../config/tally.config');

async function main() {
  console.log(`Connecting to Tally at ${tallyUrl}`);
  console.log(`Requesting stock item list for company: "${companyName}"\n`);

  try {
    const xmlRequest = listOfStockItemsRequest(companyName);
    const rawXml = await sendToTally(xmlRequest);

    console.log('--- RAW XML RESPONSE (first 1200 chars) ---');
    console.log(rawXml.substring(0, 1200));

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(rawXml);

    console.log('\n--- PARSED RESPONSE (full structure) ---');
    console.log(JSON.stringify(parsed, null, 2));

    console.log('\n✅ Connection successful. Copy the structure above back to Claude —');
    console.log('   that\'s what we use to confirm exactly where HSN/GST/quantity sit');
    console.log('   in the response, before writing the real stock-fetch API.');
  } catch (err) {
    console.error('\n❌ Failed to fetch stock items.');
    console.error('Error:', err.message);
    console.error('\nCheck, in order:');
    console.error('  1. Is Tally Prime open with the sandbox company loaded?');
    console.error('  2. Did the ledger test (npm run test:tally) work already? If yes, the');
    console.error('     connection itself is fine and this is likely a collection-name issue.');
    console.error('  3. Does TALLY_COMPANY in .env exactly match the company name in Tally?');
  }
}

main();
