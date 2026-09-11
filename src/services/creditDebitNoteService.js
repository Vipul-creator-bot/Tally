const { sendToTally } = require('../integration/tallyClient');
const { createCreditOrDebitNoteRequest } = require('../integration/xmlTemplates');
const idempotencyStore = require('./idempotencyStore');
const config = require('../config/tally.config');

async function createCreditOrDebitNote(note) {
  const { noteType } = note;

  if (idempotencyStore.hasBeenProcessed(noteType, note.voucherNumber)) {
    const err = new Error(`Voucher number "${note.voucherNumber}" was already processed.`);
    err.code = 'DUPLICATE_VOUCHER';
    throw err;
  }

   const ledgerNames = {
    salesOrPurchaseLedgerName: noteType === 'Credit Note' ? config.salesLedgerName : config.purchaseLedgerName,
    cgstLedgerName: noteType === 'Credit Note' ? config.cgstOutputLedgerName : config.cgstInputLedgerName,
    sgstLedgerName: noteType === 'Credit Note' ? config.sgstOutputLedgerName : config.sgstInputLedgerName,
    igstLedgerName: noteType === 'Credit Note' ? config.igstOutputLedgerName : config.igstInputLedgerName,
  };

  const xmlRequest = createCreditOrDebitNoteRequest(config.companyName, note, ledgerNames);
  const rawXml = await sendToTally(xmlRequest);

  const lineErrorMatch = rawXml.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
  if (lineErrorMatch && lineErrorMatch[1]) {
    const err = new Error(lineErrorMatch[1]);
    err.code = 'TALLY_VALIDATION_ERROR';
    throw err;
  }
  if (!rawXml.includes('<CREATED>1</CREATED>')) {
    throw new Error(`Tally did not confirm the ${noteType} was created`);
  }

  idempotencyStore.markProcessed(noteType, note.voucherNumber);

  return {
    status: 'created',
    noteType,
    voucherNumber: note.voucherNumber,
    partyLedgerName: note.partyLedgerName,
    itemCount: note.items.length,
  };
}

module.exports = { createCreditOrDebitNote };