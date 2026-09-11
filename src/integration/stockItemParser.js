function cleanTallyString(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^&#4;\s*/, '').trim();
}

function getText(node) {
  if (node == null) return null;
  if (typeof node === 'object' && '#text' in node) return node['#text'];
  return node;
}

function parseOpeningBalance(rawText) {
  if (!rawText || typeof rawText !== 'string') return { quantity: 0, unit: null };
  const match = rawText.trim().match(/^(-?[\d.]+)\s*(.*)$/);
  if (!match) return { quantity: 0, unit: null };
  return { quantity: parseFloat(match[1]), unit: match[2] || null };
}

function extractGstRates(gstDetails) {
  const rateList = gstDetails?.['STATEWISEDETAILS.LIST']?.['RATEDETAILS.LIST'];
  const rates = Array.isArray(rateList) ? rateList : rateList ? [rateList] : [];

  const breakup = {};
  for (const rate of rates) {
    const head = getText(rate.GSTRATEDUTYHEAD);
    const value = getText(rate.GSTRATE);
    if (head && value != null) {
      breakup[head.toLowerCase().replace(/\//g, '_')] = value;
    }
  }

  return {
    cgst: breakup.cgst ?? null,
    sgst: breakup['sgst_utgst'] ?? null,
    igst: breakup.igst ?? null,
    effectiveRate: breakup.igst ?? null,
  };
}

// Names come back as either a single string (no alias) or an array
// (first entry = real name, rest = aliases) — confirmed against a real
// item with one alias set via the Tally UI.
function extractNameAndAlias(languageNameList) {
  const rawName = languageNameList?.['NAME.LIST']?.NAME;
  if (Array.isArray(rawName)) {
    return { name: rawName[0], alias: rawName[1] || null };
  }
  return { name: rawName || null, alias: null };
}

function parseStockItem(rawItem) {
  const gstDetails = rawItem['GSTDETAILS.LIST'];
  const hsnDetails = rawItem['HSNDETAILS.LIST'];
  const opening = parseOpeningBalance(getText(rawItem.OPENINGBALANCE));
  const { alias } = extractNameAndAlias(rawItem['LANGUAGENAME.LIST']);

  return {
    name: rawItem['@_NAME'],
    alias,
    parent: cleanTallyString(getText(rawItem.PARENT)),
    baseUnit: getText(rawItem.BASEUNITS),
    gstApplicable: cleanTallyString(getText(rawItem.GSTAPPLICABLE)),
    openingQuantity: opening.quantity,
    openingUnit: opening.unit,
    openingValue: Math.abs(getText(rawItem.OPENINGVALUE) ?? 0),
    hsnCode: hsnDetails && hsnDetails.HSNCODE ? String(getText(hsnDetails.HSNCODE)) : null,
    gst: gstDetails && gstDetails['STATEWISEDETAILS.LIST'] ? extractGstRates(gstDetails) : null,
  };
}

function parseStockItemsDetailed(parsedXml) {
  const raw = parsedXml?.ENVELOPE?.BODY?.DATA?.COLLECTION?.STOCKITEM;
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map(parseStockItem);
}

module.exports = {
  parseStockItemsDetailed,
};