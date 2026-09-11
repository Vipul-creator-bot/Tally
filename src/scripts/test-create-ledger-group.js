const { sendToTally } = require('../integration/tallyClient');
const { createLedgerGroupRequest, createCustomerLedgerRequest } = require('../integration/xmlTemplates');
const config = require('../config/tally.config');

async function main() {
  console.log('Step 1: create "Website Customer" under Sundry Debtors...');
  await sendToTally(createLedgerGroupRequest(config.companyName, 'Website Customer', 'Sundry Debtors'));

  console.log('Step 2: create "Firm Customers" under Website Customer...');
  await sendToTally(createLedgerGroupRequest(config.companyName, 'Firm Customers', 'Website Customer'));

  console.log('Step 3: create "Personal Customers" under Website Customer...');
  await sendToTally(createLedgerGroupRequest(config.companyName, 'Personal Customers', 'Website Customer'));

  console.log('Step 4: create a test customer INSIDE "Firm Customers"...');
  const xmlRequest = createCustomerLedgerRequest(config.companyName, {
    name: 'ZZZ-TEST-B2B-CUSTOMER',
    parentGroup: 'Firm Customers',
    gstin: '06AAAAA0000A1Z6',
    state: 'Haryana',
  });
  const rawXml = await sendToTally(xmlRequest);

  if (rawXml.includes('<CREATED>1</CREATED>')) {
    console.log('✅ Success! Check Tally: Gateway of Tally → Chart of Accounts → look for');
    console.log('   "Website Customer" group, containing "Firm Customers" and "Personal Customers",');
    console.log('   with ZZZ-TEST-B2B-CUSTOMER sitting inside Firm Customers.');
  } else {
    console.log('⚠️ Not created — check the response above.');
  }
}

main();