const { sendToTally } = require('../integration/tallyClient');
const { updateStockItemRequest } = require('../integration/xmlTemplates');
const config = require('../config/tally.config');

async function main() {
  console.log('Altering "Steel Plate Set" — the ONE item that still has intact GST/HSN —');
  console.log('with NOTHING changed except resending its exact current values.\n');
  console.log('If this wipes it too, the bug is in how Alter handles the nested GST list,');
  console.log('full stop. If it survives, something else is interacting with it.\n');

  const item = {
    hsnCode: '73239900',
    gstRate: 12,
    openingQuantity: 200,
    openingValue: 60000,
    // deliberately NO alias — isolating just the GST/HSN resend
  };

  const xmlRequest = updateStockItemRequest(config.companyName, 'Steel Plate Set', item);
  const rawXml = await sendToTally(xmlRequest);
  console.log('Done — now run npm run test:stock:detailed and check Steel Plate Set.');
}

main();