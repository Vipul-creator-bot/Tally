const { XMLParser } = require('fast-xml-parser');
const { sendToTally } = require('../integration/tallyClient');
const { listOfLedgersRequest } = require('../integration/xmlTemplates');
const { companyName, tallyUrl } = require('../config/tally.config');

async function main() {
  console.log(`Connecting to Tally at ${tallyUrl}`);
  console.log(`Requesting ledger list for company: "${companyName}"\n`);

  try {
    const xmlRequest = listOfLedgersRequest(companyName);
    const rawXml = await sendToTally(xmlRequest);

    console.log('--- RAW XML RESPONSE (first 800 chars) ---');
    console.log(rawXml.substring(0, 800));

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(rawXml);

    console.log('\n--- PARSED RESPONSE (full structure) ---');
    console.log(JSON.stringify(parsed, null, 2));

    console.log('\n✅ Connection successful. Copy the structure above back to Claude —');
    console.log('   that\'s what we use to write the real parser for the ledger-list API.');
  } catch (err) {
    console.error('\n❌ Failed to connect to Tally.');
    console.error('Error:', err.message);
    console.error('\nCheck, in order:');
    console.error('  1. Is Tally Prime open with the sandbox company loaded?');
    console.error('  2. Is the HTTP gateway enabled (F1 > Settings > Connectivity > Both, port 9000)?');
    console.error('  3. Does TALLY_URL in your .env match (default http://localhost:9000)?');
    console.error('  4. Does TALLY_COMPANY in your .env exactly match the company name in Tally?');
  }
}

main();
