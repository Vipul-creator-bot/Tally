const { sendToTally } = require('../integration/tallyClient');
const { createSalesInvoiceRequest } = require('../integration/xmlTemplates');
const stockItemService = require('./stockItemService');
const customerService = require('./customerService');
const idempotencyStore = require('./idempotencyStore');
const config = require('../config/tally.config');

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function createSalesInvoice(invoice) {
  if (idempotencyStore.hasBeenProcessed('Sales', invoice.voucherNumber)) {
    const err = new Error(`Voucher number "${invoice.voucherNumber}" was already processed. Use a new voucher number.`);
    err.code = 'DUPLICATE_VOUCHER';
    throw err;
  }

  // HARD BLOCK: never allow a sale that would take any item below zero stock.
  const currentStock = await stockItemService.listStockItems();
  const stockByName = new Map(currentStock.map((i) => [i.name, i.openingQuantity]));

  for (const item of invoice.items) {
    const available = stockByName.get(item.name) ?? 0;
    if (item.quantity > available) {
      const err = new Error(`Insufficient stock for "${item.name}": requested ${item.quantity}, only ${available} available.`);
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }
  }

   const ledgerNames = {
    salesLedgerName: config.salesLedgerName,
    cgstLedgerName: config.cgstOutputLedgerName,
    sgstLedgerName: config.sgstOutputLedgerName,
    igstLedgerName: config.igstOutputLedgerName,
  };

  const xmlRequest = createSalesInvoiceRequest(config.companyName, invoice, ledgerNames);
  const rawXml = await sendToTally(xmlRequest);

  const lineErrorMatch = rawXml.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
  if (lineErrorMatch && lineErrorMatch[1]) {
    const err = new Error(lineErrorMatch[1]);
    err.code = 'TALLY_VALIDATION_ERROR';
    throw err;
  }
  if (!rawXml.includes('<CREATED>1</CREATED>')) {
    throw new Error('Tally did not confirm the invoice was created');
  }

  const aliasByName = new Map(currentStock.map((i) => [i.name, i.alias]));

  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const billItems = invoice.items.map((item) => {
    const amount = round2(item.quantity * item.rate);
    subtotal += amount;

    let cgst = 0, sgst = 0, igst = 0;
    if (invoice.isInterState) {
      igst = round2((amount * item.gstRate) / 100);
      totalIgst += igst;
    } else {
      const halfRate = item.gstRate / 2;
      cgst = round2((amount * halfRate) / 100);
      sgst = round2((amount * halfRate) / 100);
      totalCgst += cgst;
      totalSgst += sgst;
    }

    return {
      displayName: aliasByName.get(item.name) || item.name,
      quantity: item.quantity,
      unit: item.unit || 'Nos',
      rate: item.rate,
      amount,
      gstRate: item.gstRate,
      cgst,
      sgst,
      igst,
    };
  });

  const totalTax = round2(totalCgst + totalSgst + totalIgst);
  const grandTotal = round2(subtotal + totalTax);

  idempotencyStore.markProcessed('Sales', invoice.voucherNumber);

  // WARNING ONLY: credit limit is a business policy, not a hard rule —
  // the caller supplies it (same pattern as MRP/description), we never
  // guess it or store it ourselves.
  let creditWarning = null;
  if (invoice.creditLimit != null) {
    try {
      const balance = await customerService.getLedgerBalance(invoice.customerName);
      const currentOwed = balance.balanceType === 'Debit' ? balance.closingBalance : 0;
      const projectedOwed = currentOwed + grandTotal;
      if (projectedOwed > invoice.creditLimit) {
        creditWarning = `This invoice pushes ${invoice.customerName}'s balance to ₹${projectedOwed.toFixed(2)}, over their credit limit of ₹${invoice.creditLimit}.`;
      }
    } catch (err) {
      // If the balance check itself fails, don't block a valid sale over it —
      // just skip the warning silently.
    }
  }

  return {
    status: 'created',
    voucherNumber: invoice.voucherNumber,
    date: invoice.date,
    customerName: invoice.customerName,
    isInterState: !!invoice.isInterState,
    items: billItems,
    subtotal,
    cgst: totalCgst,
    sgst: totalSgst,
    igst: totalIgst,
    totalTax,
    grandTotal,
    ...(creditWarning ? { creditLimitWarning: creditWarning } : {}),
  };
}

module.exports = { createSalesInvoice };