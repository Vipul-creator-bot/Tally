// const { sendToTally } = require('../integration/tallyClient');
// const { createSalesInvoiceRequest } = require('../integration/xmlTemplates');
// const config = require('../config/tally.config');

// async function main() {
//   console.log(`Connecting to Tally at ${config.tallyUrl}`);
//   console.log(`Creating a test Sales Invoice in company: "${config.companyName}"\n`);

//   const invoice = {
//     customerName: 'Test API Customer',
//     voucherNumber: 'TEST-INV-001',
//     date: '20260401', // matches this sandbox's current period
//     isInterState: false, // customer + company both Haryana -> CGST+SGST
//     items: [
//       { name: 'Stainless Steel Pan', quantity: 2, rate: 850, unit: 'Nos', gstRate: 18 },
//     ],
//   };

//   const ledgerNames = {
//     salesLedgerName: config.salesLedgerName,
//     cgstLedgerName: config.cgstLedgerName,
//     sgstLedgerName: config.sgstLedgerName,
//     igstLedgerName: config.igstLedgerName,
//   };

//   try {
//     const xmlRequest = createSalesInvoiceRequest(config.companyName, invoice, ledgerNames);
//     console.log('--- XML REQUEST SENT ---');
//     console.log(xmlRequest);

//     const rawXml = await sendToTally(xmlRequest);
//     console.log('\n--- RAW RESPONSE FROM TALLY ---');
//     console.log(rawXml);

//     if (rawXml.includes('<CREATED>1</CREATED>')) {
//       console.log('\n✅ Sales Invoice created! Check Gateway of Tally > Day Book to confirm.');
//     } else {
//       console.log('\n⚠️  Not created — paste this full response back.');
//     }
//   } catch (err) {
//     console.error('\n❌ Request failed.');
//     console.error('Error:', err.message);
//   }
// }

// main();



const { sendToTally } = require('../integration/tallyClient');
const {
  createCustomerLedgerRequest,
  createStockItemRequest,
  createSalesInvoiceRequest,
} = require('../integration/xmlTemplates');
const config = require('../config/tally.config');

async function main() {
  console.log(`Connecting to Tally at ${config.tallyUrl}`);
  console.log(`Setting up prerequisites in company: "${config.companyName}"\n`);

  try {
    // 1. Ensure Customer Ledger Exists
    const customerXml = createCustomerLedgerRequest(config.companyName, {
      name: 'Test API Customer',
      parentGroup: 'Sundry Debtors',
      state: 'Haryana',
    });
    await sendToTally(customerXml);

    // 2. Ensure Stock Item Exists
    const itemXml = createStockItemRequest(config.companyName, {
      name: 'Stainless Steel Pan',
      baseUnit: 'Nos',
      hsnCode: '73239390',
      gstRate: 18,
    });
    await sendToTally(itemXml);

    console.log('Prerequisites created/verified. Creating Sales Invoice...\n');

    // 3. Create Sales Invoice
    const invoice = {
      customerName: 'Test API Customer',
      voucherNumber: 'TEST-INV-001',
      date: '20260401', // Ensure this date falls within Khurana Test Co's open FY
      isInterState: false,
      items: [
        { name: 'Stainless Steel Pan', quantity: 2, rate: 850, unit: 'Nos', gstRate: 18 },
      ],
    };

    const ledgerNames = {
      salesLedgerName: config.salesLedgerName,
      cgstLedgerName: config.cgstLedgerName,
      sgstLedgerName: config.sgstLedgerName,
      igstLedgerName: config.igstLedgerName,
    };

    const xmlRequest = createSalesInvoiceRequest(config.companyName, invoice, ledgerNames);
    console.log('--- XML REQUEST SENT ---');
    console.log(xmlRequest);

    const rawXml = await sendToTally(xmlRequest);
    console.log('\n--- RAW RESPONSE FROM TALLY ---');
    console.log(rawXml);

    if (rawXml.includes('<CREATED>1</CREATED>')) {
      console.log('\n✅ Sales Invoice created! Check Gateway of Tally > Day Book to confirm.');
    } else {
      console.log('\n⚠️  Not created — paste this full response back.');
    }
  } catch (err) {
    console.error('\n❌ Request failed.');
    console.error('Error:', err.message);
  }
}

main();