const { sendToTally } = require('../integration/tallyClient');
const { createCustomerLedgerRequest } = require('../integration/xmlTemplates');
const { companyName, tallyUrl } = require('../config/tally.config');

async function main() {
  console.log(`Connecting to Tally at ${tallyUrl}`);
  console.log(`Creating a test customer ledger in company: "${companyName}"\n`);

  const testCustomer = {
    name: 'Test API Customer',
    parentGroup: 'Sundry Debtors',
    gstin: '06AAAAA0000A1Z6', // dummy, well-formed GSTIN — sandbox only
    openingBalance: 0,
  };

  try {
    const xmlRequest = createCustomerLedgerRequest(companyName, testCustomer);

    console.log('--- XML REQUEST SENT ---');
    console.log(xmlRequest);

    const rawXml = await sendToTally(xmlRequest);

    console.log('\n--- RAW RESPONSE FROM TALLY ---');
    console.log(rawXml);

    if (rawXml.includes('<CREATED>1</CREATED>')) {
      console.log('\n✅ Ledger created! Check Gateway of Tally > Display More Reports >');
      console.log('   Account Books > Ledger to confirm "Test API Customer" now exists.');
    } else if (/<LINEERROR>.+<\/LINEERROR>/.test(rawXml)) {
      console.log('\n⚠️  Tally rejected it with a LINEERROR — see the exact text above.');
      console.log('   Paste this whole block back, it tells us precisely what to fix.');
    } else {
      console.log('\n⚠️  Unexpected response shape — paste the full raw response above back.');
    }
  } catch (err) {
    console.error('\n❌ Request failed.');
    console.error('Error:', err.message);
  }
}

main();