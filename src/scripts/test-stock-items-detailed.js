const { XMLParser } = require('fast-xml-parser');
const { sendToTally } = require('../integration/tallyClient');
const { listOfStockItemsDetailedRequest } = require('../integration/xmlTemplates');
const { companyName, tallyUrl } = require('../config/tally.config');
const { parseStockItemsDetailed } = require('../integration/stockItemParser');

async function main() {
  console.log(`Connecting to Tally at ${tallyUrl}`);
  console.log(`Requesting DETAILED stock item data for company: "${companyName}"\n`);

  try {
    const xmlRequest = listOfStockItemsDetailedRequest(companyName);
    const rawXml = await sendToTally(xmlRequest);

    console.log('--- RAW XML RESPONSE (first 2500 chars) ---');
    console.log(rawXml.substring(0, 2500));

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(rawXml);

    console.log('\n--- PARSED RESPONSE (full structure) ---');
    console.log(JSON.stringify(parsed, null, 2));

        const cleanItems = parseStockItemsDetailed(parsed);
    console.log('\n--- CLEAN, NORMALIZED STOCK ITEMS ---');
    console.log(JSON.stringify(cleanItems, null, 2));

    console.log('\n✅ Connection successful. Copy the FULL structure above back to Claude —');
    console.log('   we need to see exactly where HSNCODE and the GST rate % actually sit');
    console.log('   before writing the real stock-item API parser.');
  } catch (err) {
    console.error('\n❌ Request failed.');
    console.error('Error:', err.message);
    console.error('\nIf you get a <LINEERROR> in the response instead of a JS error,');
    console.error('paste the raw XML anyway — that error text tells us exactly which');
    console.error('FETCH field name Tally didn\'t recognize, so we can fix it.');
  }
}

main();