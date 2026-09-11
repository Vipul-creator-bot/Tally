const { XMLParser } = require('fast-xml-parser');
const { sendToTally } = require('../integration/tallyClient');
const {
  listOfLedgersRequest,
  createCustomerLedgerRequest,
  createStockGroupRequest,
  createPurchaseVoucherRequest,
} = require('../integration/xmlTemplates');
const config = require('../config/tally.config');
const stockItemService = require('./stockItemService');
const idempotencyStore = require('./idempotencyStore');

function formatTallyDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function ensureVendorExists(vendorName, existingLedgerNames) {
  if (existingLedgerNames.has(vendorName)) return;
  const xmlRequest = createCustomerLedgerRequest(config.companyName, {
    name: vendorName,
    parentGroup: 'Sundry Creditors',
    state: 'Haryana',
  });
  await sendToTally(xmlRequest);
  existingLedgerNames.add(vendorName);
}

async function ensureStockGroupExists(groupName, attemptedGroups) {
  if (!groupName || attemptedGroups.has(groupName)) return;
  attemptedGroups.add(groupName);
  try {
    await sendToTally(createStockGroupRequest(config.companyName, groupName));
  } catch (err) {
    // best-effort — if it already exists, that's fine
  }
}

async function ensureStockItemExists(row, existingItemNames) {
  if (existingItemNames.has(row.itemName)) return;
  await stockItemService.createStockItem({
    name: row.itemName,
    alias: row.alias || undefined,
    parentGroup: row.category || undefined,
    baseUnit: 'Nos',
    hsnCode: row.hsnCode,
    gstRate: row.gstRate,
    openingQuantity: 0,
    openingValue: 0,
  });
  existingItemNames.add(row.itemName);
}

async function bulkUploadPurchaseBills(rows) {
  const existingItems = await stockItemService.listStockItems();
  const existingItemNames = new Set(existingItems.map((i) => i.name));

  const ledgersXml = await sendToTally(listOfLedgersRequest(config.companyName));
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsedLedgers = parser.parse(ledgersXml);
  const rawLedgers = parsedLedgers?.ENVELOPE?.BODY?.DATA?.COLLECTION?.LEDGER;
  const ledgerArray = Array.isArray(rawLedgers) ? rawLedgers : rawLedgers ? [rawLedgers] : [];
  const existingLedgerNames = new Set(ledgerArray.map((l) => l['@_NAME']));

  const attemptedGroups = new Set();

  const groups = {};
  for (const row of rows) {
    const key = `${row.firmName}||${row.billNo}`;
    if (!groups[key]) groups[key] = { vendorName: row.firmName, billNumber: row.billNo, items: [], rowNumbers: [] };
    groups[key].items.push(row);
    groups[key].rowNumbers.push(row.rowNumber);
  }

  const results = { billsCreated: [], billsFailed: [], hasUnmappedMrp: false };

  for (const key of Object.keys(groups)) {
    const group = groups[key];

    if (!group.vendorName || !group.billNumber || group.items.length === 0) {
      results.billsFailed.push({ rows: group.rowNumbers, reason: 'Missing Firm name or Bill no' });
      continue;
    }

    const idempotencyKey = `${group.vendorName}::${group.billNumber}`;

    try {
      if (idempotencyStore.hasBeenProcessed('Purchase', idempotencyKey)) {
        throw new Error(`Bill "${group.billNumber}" for "${group.vendorName}" was already processed.`);
      }

      await ensureVendorExists(group.vendorName, existingLedgerNames);

      for (const row of group.items) {
        if (!row.itemName || !row.hsnCode || !row.gstRate) {
          throw new Error(`Row ${row.rowNumber}: missing Stock item name, HSN, or GST rate`);
        }
        await ensureStockGroupExists(row.category, attemptedGroups);
        await ensureStockItemExists(row, existingItemNames);
        if (row.mrp) results.hasUnmappedMrp = true;
      }

            const ledgerNames = {
        purchaseLedgerName: config.purchaseLedgerName,
        cgstLedgerName: config.cgstInputLedgerName,
        sgstLedgerName: config.sgstInputLedgerName,
        igstLedgerName: config.igstInputLedgerName,
      };

      const xmlRequest = createPurchaseVoucherRequest(config.companyName, {
        vendorName: group.vendorName,
        billNumber: group.billNumber,
        date: formatTallyDate(new Date()),
        // date: '20260901',
        isInterState: false,
        items: group.items.map((row) => ({
          name: row.itemName,
          quantity: row.quantity,
          rate: row.purchaseRate,
          baseUnit: row.unit || 'Nos',
          gstRate: row.gstRate,
        })),
      }, ledgerNames);

      const rawXml = await sendToTally(xmlRequest);

      const lineErrorMatch = rawXml.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
      if (lineErrorMatch && lineErrorMatch[1]) throw new Error(lineErrorMatch[1]);
      if (!rawXml.includes('<CREATED>1</CREATED>')) throw new Error('Tally did not confirm the purchase voucher was created');

      idempotencyStore.markProcessed('Purchase', idempotencyKey);
      results.billsCreated.push({ vendorName: group.vendorName, billNumber: group.billNumber, itemCount: group.items.length });
    } catch (err) {
      results.billsFailed.push({ vendorName: group.vendorName, billNumber: group.billNumber, rows: group.rowNumbers, reason: err.message });
    }
  }

  return results;
}

module.exports = { bulkUploadPurchaseBills };