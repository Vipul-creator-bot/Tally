const { sendToTally } = require('../integration/tallyClient');
const { createStockGroupRequest } = require('../integration/xmlTemplates');
const { companyName, tallyUrl } = require('../config/tally.config');

async function main() {
  console.log(`Connecting to Tally at ${tallyUrl}`);
  console.log(`Creating Stock Group "Primary" in: "${companyName}"\n`);

  try {
    const xmlRequest = createStockGroupRequest(companyName, 'Primary');
    const rawXml = await sendToTally(xmlRequest);
    console.log('--- RAW RESPONSE FROM TALLY ---');
    console.log(rawXml);
  } catch (err) {
    console.error('\n❌ Request failed.');
    console.error('Error:', err.message);
  }
}

main();