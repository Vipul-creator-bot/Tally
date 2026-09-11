const { sendToTally } = require('../integration/tallyClient');
const { createVendorLedgerRequestPlaceholder } = require('../integration/xmlTemplates'); // not used, remove if present
const { createCustomerLedgerRequest, createPurchaseVoucherRequest } = require('../integration/xmlTemplates');
const config = require('../config/tally.config');

async function main() {
  console.log('Step 1: ensure test vendor ledger exists...');
  const vendorXml = createCustomerLedgerRequest(config.companyName, {
    name: 'Test Vendor Pvt Ltd',
    parentGroup: 'Sundry Creditors',
    state: 'Haryana',
  });
  await sendToTally(vendorXml);

  console.log('Step 2: create the purchase voucher...\n');
  const bill = {
    vendorName: 'Test Vendor Pvt Ltd',
    billNumber: 'VB-001',
    date: '20260401',
    isInterState: false,
    items: [
      { name: 'Stainless Steel Pan', quantity: 10, rate: 500, unit: 'Nos', gstRate: 18 },
    ],
  };

  const ledgerNames = {
    purchaseLedgerName: 'Purchase',
    cgstLedgerName: config.cgstLedgerName,
    sgstLedgerName: config.sgstLedgerName,
    igstLedgerName: config.igstLedgerName,
  };

  const xmlRequest = createPurchaseVoucherRequest(config.companyName, bill, ledgerNames);
  const rawXml = await sendToTally(xmlRequest);

  if (rawXml.includes('<CREATED>1</CREATED>')) {
    console.log('✅ Purchase voucher created! Check Day Book / Stock Summary — "Stainless Steel Pan" should show +10 qty.');
  } else {
    console.log('⚠️ Not created — check the terminal log above for the full response.');
  }
}

main();