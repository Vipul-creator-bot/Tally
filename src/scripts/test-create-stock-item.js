const { sendToTally } = require('../integration/tallyClient');
const { createStockItemRequest } = require('../integration/xmlTemplates');
const { companyName, tallyUrl } = require('../config/tally.config');

async function main() {
  console.log(`Connecting to Tally at ${tallyUrl}`);
  console.log(`Creating a test stock item in company: "${companyName}"\n`);

  const testItem = {
    name: 'Pressure Cooker 3L',
    // parentGroup: 'Primary',
    baseUnit: 'Nos',
    hsnCode: '73239900',
    gstRate: 18,
    openingQuantity: 60,
    openingValue: 54000,
  };

  try {
    const xmlRequest = createStockItemRequest(companyName, testItem);
    console.log('--- XML REQUEST SENT ---');
    console.log(xmlRequest);

    const rawXml = await sendToTally(xmlRequest);
    console.log('\n--- RAW RESPONSE FROM TALLY ---');
    console.log(rawXml);

   if (rawXml.includes('<CREATED>1</CREATED>') || rawXml.includes('<ALTERED>1</ALTERED>')) {
  console.log('\n✅ Stock item saved (created or updated)! Check Stock Summary to confirm.');
} else if (rawXml.includes('<EXCEPTIONS>0</EXCEPTIONS>') && rawXml.includes('<ERRORS>0</ERRORS>')) {
  console.log('\n✅ No errors reported — check Stock Summary to confirm the item.');
} else {
  console.log('\n⚠️  Something didn\'t go through — paste this full response back.');
}
  } catch (err) {
    console.error('\n❌ Request failed.');
    console.error('Error:', err.message);
  }
}

main();