const { sendToTally } = require('../integration/tallyClient');
const { createPaymentOrReceiptRequest } = require('../integration/xmlTemplates');
const config = require('../config/tally.config');

async function main() {
  console.log('Testing a Payment voucher (paying Bright Traders via Cash)...\n');

  const xmlRequest = createPaymentOrReceiptRequest(config.companyName, {
    voucherType: 'Payment',
    partyLedgerName: 'Bright Traders',
    cashBankLedgerName: 'Cash',
    amount: 5000,
    voucherNumber: 'MANUAL-TEST-001',
    date: '20260901', // sandbox EDU-mode date restriction still applies — use 1st/2nd/last of month
    narration: 'Test payment to vendor',
  });

  const rawXml = await sendToTally(xmlRequest);

  if (rawXml.includes('<CREATED>1</CREATED>')) {
    console.log('✅ Payment voucher created! Check the vendor ledger balance in Tally — it should have decreased by 5000.');
  } else {
    console.log('⚠️ Not created — check the response above.');
  }
}

main();