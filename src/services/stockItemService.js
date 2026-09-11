const { XMLParser } = require('fast-xml-parser');
const { sendToTally } = require('../integration/tallyClient');
const {
  listOfStockItemsDetailedRequest,
  createStockItemRequest,
  updateStockItemRequest,
  createStockGroupRequest,
} = require('../integration/xmlTemplates');
const { parseStockItemsDetailed } = require('../integration/stockItemParser');
const { companyName } = require('../config/tally.config');

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function listStockItems() {
  const xmlRequest = listOfStockItemsDetailedRequest(companyName);
  const rawXml = await sendToTally(xmlRequest);
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(rawXml);
  return parseStockItemsDetailed(parsed);
}

async function createStockItem(item) {
  if (item.parentGroup) await ensureStockGroupExists(item.parentGroup);

  const xmlRequest = createStockItemRequest(companyName, item);
  const rawXml = await sendToTally(xmlRequest);

  const lineErrorMatch = rawXml.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
  if (lineErrorMatch && lineErrorMatch[1]) {
    const err = new Error(lineErrorMatch[1]);
    err.code = 'TALLY_VALIDATION_ERROR';
    throw err;
  }
  const created = rawXml.includes('<CREATED>1</CREATED>');
  const altered = rawXml.includes('<ALTERED>1</ALTERED>');
  if (!created && !altered) throw new Error('Tally did not confirm the stock item was saved');

  return { name: item.name, status: created ? 'created' : 'updated' };
}

async function updateStockItem(existingName, item) {
  if (item.parentGroup) await ensureStockGroupExists(item.parentGroup);

  const xmlRequest = updateStockItemRequest(companyName, existingName, item);
  const rawXml = await sendToTally(xmlRequest);

  const lineErrorMatch = rawXml.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
  if (lineErrorMatch && lineErrorMatch[1]) {
    const err = new Error(lineErrorMatch[1]);
    err.code = 'TALLY_VALIDATION_ERROR';
    throw err;
  }
  const altered = rawXml.includes('<ALTERED>1</ALTERED>');
  const created = rawXml.includes('<CREATED>1</CREATED>');
  if (!altered && !created) throw new Error('Tally did not confirm the stock item was updated');

  return { name: item.name || existingName, status: 'updated' };
}

const attemptedGroups = new Set();
async function ensureStockGroupExists(groupName) {
  if (!groupName || attemptedGroups.has(groupName)) return;
  attemptedGroups.add(groupName);
  try {
    await sendToTally(createStockGroupRequest(companyName, groupName));
  } catch (err) {
    // best-effort — if it already exists, that's fine
  }
}

// Confirmed rule: same name = update with sheet's values. New name = create.
// ASSUMPTION: "Sale price" is used as the cost basis for opening value,
// same treatment as the Purchase Bill sheet, since no separate "Purchase
// Price" column exists in the confirmed template. MRP is captured and
// returned to the caller, but NOT written to Tally (no appropriate field
// for it) — the website is expected to store it in its own catalog.
async function bulkUpsertStockItems(rows) {
  const existing = await listStockItems();
  const existingNames = new Set(existing.map((item) => item.name));

  const results = { created: [], updated: [], failed: [] };

  for (const row of rows) {
    if (!row.name || !row.hsnCode || !row.gstRate) {
      results.failed.push({ row: row.rowNumber, name: row.name, reason: 'Missing required field (Stock item name, HSN, or GST rate)' });
      continue;
    }

    if (row.category) {
      await ensureStockGroupExists(row.category);
    }

    const item = {
      name: row.name,
      alias: row.alias || undefined,
      parentGroup: row.category || undefined,
      baseUnit: row.unit || 'Nos',
      hsnCode: row.hsnCode,
      gstRate: row.gstRate,
      openingQuantity: row.openingQuantity,
      openingValue: round2(row.openingQuantity * row.salePrice),
    };

    const summary = {
      name: row.name,
      alias: row.alias || null,
      category: row.category || null,
      description: row.description || null,
      mrp: row.mrp || null,
    };

    try {
      if (existingNames.has(row.name)) {
        await updateStockItem(row.name, item);
        results.updated.push({ ...summary, status: 'updated' });
      } else {
        await createStockItem(item);
        results.created.push({ ...summary, status: 'created' });
        existingNames.add(row.name);
      }
    } catch (err) {
      results.failed.push({ row: row.rowNumber, name: row.name, reason: err.message });
    }
  }

  return results;
}

module.exports = { listStockItems, createStockItem, updateStockItem, bulkUpsertStockItems };