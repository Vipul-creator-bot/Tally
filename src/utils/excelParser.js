const XLSX = require('xlsx');

// Column names now match the CONFIRMED templates exactly (both Stock
// Updation and Purchase Bill use the same vocabulary): Stock item name,
// Alias name, Stock quantity, Category, Mrp, Sale price, HSN,
// description, GST rate.
function parseStockItemExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows.map((raw, index) => {
    const get = (...keys) => {
      for (const key of Object.keys(raw)) {
        if (keys.includes(key.trim().toLowerCase())) return raw[key];
      }
      return undefined;
    };

    const gstRaw = get('gst rate', 'gst %', 'gst%', 'gst');
    const gstRate = typeof gstRaw === 'string' ? parseFloat(gstRaw.replace('%', '').trim()) : Number(gstRaw);

    return {
      rowNumber: index + 2,
      name: String(get('stock item name', 'item name', 'name') || '').trim(),
      alias: String(get('alias name', 'alias') || '').trim(),
      category: String(get('category') || '').trim(),
      mrp: Number(get('mrp') || 0),
      salePrice: Number(get('sale price', 'selling price', 'sales price') || 0),
      hsnCode: String(get('hsn', 'hsn code') || '').trim(),
      description: String(get('description') || '').trim(),
      gstRate,
      openingQuantity: Number(get('stock quantity', 'opening stock', 'opening quantity', 'quantity') || 0),
      unit: String(get('unit', 'uom', 'base unit') || 'Nos').trim(),
    };
  });
}

function parsePurchaseBillExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows.map((raw, index) => {
    const get = (...keys) => {
      for (const key of Object.keys(raw)) {
        if (keys.includes(key.trim().toLowerCase())) return raw[key];
      }
      return undefined;
    };

    const gstRaw = get('gst rate', 'gst %', 'gst%', 'gst');
    const gstRate = typeof gstRaw === 'string' ? parseFloat(gstRaw.replace('%', '').trim()) : Number(gstRaw);

    return {
      rowNumber: index + 2,
      firmName: String(get('firm name', 'firm', 'vendor', 'vendor name') || '').trim(),
      billNo: String(get('bill no', 'bill number', 'billno') || '').trim(),
      itemName: String(get('stock item name', 'item name', 'name') || '').trim(),
      alias: String(get('alias name', 'alias') || '').trim(),
      quantity: Number(get('stock quantity', 'quantity', 'qty') || 0),
      category: String(get('category') || '').trim(),
      mrp: Number(get('mrp') || 0),
      purchaseRate: Number(get('sale price', 'saleprice', 'rate') || 0),
      hsnCode: String(get('hsn', 'hsn code') || '').trim(),
      description: String(get('description') || '').trim(),
      gstRate,
    };
  });
}

module.exports = { parseStockItemExcel, parsePurchaseBillExcel };