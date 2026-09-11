const { XMLParser } = require('fast-xml-parser');
const { sendToTally } = require('../integration/tallyClient');
const { listOfVouchersRequest } = require('../integration/xmlTemplates');
const config = require('../config/tally.config');

async function main() {
  console.log('Fetching ALL vouchers for the sandbox\'s current period (20260401–20270331)...\n');

  const xmlRequest = listOfVouchersRequest(config.companyName, '20260401', '20270331');
  const rawXml = await sendToTally(xmlRequest);

  console.log('--- RAW XML (first 3000 chars) ---');
  console.log(rawXml.substring(0, 3000));

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(rawXml);
  console.log('\n--- PARSED (full) ---');
  console.log(JSON.stringify(parsed, null, 2));
}

main();