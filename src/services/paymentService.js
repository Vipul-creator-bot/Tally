const { sendToTally } = require('../integration/tallyClient');
const { createPaymentOrReceiptRequest } = require('../integration/xmlTemplates');
const idempotencyStore = require('./idempotencyStore');
const config = require('../config/tally.config');

async function createPaymentOrReceipt(voucher) {
  const { voucherType } = voucher;

  if (idempotencyStore.hasBeenProcessed(voucherType, voucher.voucherNumber)) {
    const err = new Error(`Voucher number "${voucher.voucherNumber}" was already processed.`);
    err.code = 'DUPLICATE_VOUCHER';
    throw err;
  }

  const xmlRequest = createPaymentOrReceiptRequest(config.companyName, voucher);
  const rawXml = await sendToTally(xmlRequest);

  const lineErrorMatch = rawXml.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
  if (lineErrorMatch && lineErrorMatch[1]) {
    const err = new Error(lineErrorMatch[1]);
    err.code = 'TALLY_VALIDATION_ERROR';
    throw err;
  }
  if (!rawXml.includes('<CREATED>1</CREATED>')) {
    throw new Error(`Tally did not confirm the ${voucherType} voucher was created`);
  }

  idempotencyStore.markProcessed(voucherType, voucher.voucherNumber);

  return {
    status: 'created',
    voucherType,
    voucherNumber: voucher.voucherNumber,
    partyLedgerName: voucher.partyLedgerName,
    amount: voucher.amount,
  };
}

module.exports = { createPaymentOrReceipt };