const { sendToTally } = require('../integration/tallyClient');
const { createCreditOrDebitNoteRequest } = require('../integration/xmlTemplates');
const config = require('../config/tally.config');

async function main() {
  console.log('Testing a Credit Note — Test API Customer returns 1 Stainless Steel Pan.\n');

  const note = {
    noteType: 'Credit Note',
    partyLedgerName: 'Test API Customer',
    voucherNumber: 'CN-001',
    date: '20260901', // sandbox EDU date restriction still applies
    isInterState: false,
    items: [
      { name: 'Stainless Steel Pan', quantity: 1, rate: 900, unit: 'Nos', gstRate: 18 },
    ],
  };

  const ledgerNames = {
    salesOrPurchaseLedgerName: config.salesLedgerName,
    cgstLedgerName: config.cgstLedgerName,
    sgstLedgerName: config.sgstLedgerName,
    igstLedgerName: config.igstLedgerName,
  };

  const xmlRequest = createCreditOrDebitNoteRequest(config.companyName, note, ledgerNames);
  const rawXml = await sendToTally(xmlRequest);

  if (rawXml.includes('<CREATED>1</CREATED>')) {
    console.log('✅ Credit Note created! Check the customer balance — it should have decreased,');
    console.log('   and Stainless Steel Pan quantity in Stock Summary should have gone UP by 1.');
  } else {
    console.log('⚠️ Not created — check the response above.');
  }
}

main();