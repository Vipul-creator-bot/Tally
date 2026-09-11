const stockItemService = require('../../services/stockItemService');
const { parseStockItemExcel } = require('../../utils/excelParser');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function listStockItems(req, res) {
  try {
    return sendSuccess(res, await stockItemService.listStockItems());
  } catch (err) {
    return sendError(res, 'TALLY_UNAVAILABLE', err.message);
  }
}

async function createStockItem(req, res) {
  const { name, alias, parentGroup, baseUnit, hsnCode, gstRate, openingQuantity, openingValue } = req.body;
  if (!name || !hsnCode || gstRate == null) {
    return sendError(res, 'INVALID_REQUEST', 'name, hsnCode, and gstRate are required', 400);
  }
  try {
    const result = await stockItemService.createStockItem({ name, alias, parentGroup, baseUnit, hsnCode, gstRate, openingQuantity, openingValue });
    return sendSuccess(res, result, 201);
  } catch (err) {
    const code = err.code || 'TALLY_UNAVAILABLE';
    return sendError(res, code, err.message, code === 'TALLY_VALIDATION_ERROR' ? 422 : 502);
  }
}

async function updateStockItem(req, res) {
  const existingName = req.params.name;
  const { name, alias, parentGroup, baseUnit, hsnCode, gstRate, openingQuantity, openingValue } = req.body;
  try {
    const result = await stockItemService.updateStockItem(existingName, { name, alias, parentGroup, baseUnit, hsnCode, gstRate, openingQuantity, openingValue });
    return sendSuccess(res, result);
  } catch (err) {
    const code = err.code || 'TALLY_UNAVAILABLE';
    return sendError(res, code, err.message, code === 'TALLY_VALIDATION_ERROR' ? 422 : 502);
  }
}

async function bulkUpload(req, res) {
  if (!req.file) {
    return sendError(res, 'INVALID_REQUEST', 'No file uploaded — send the Excel file as form-data field "file"', 400);
  }
  let rows;
  try {
    rows = parseStockItemExcel(req.file.buffer);
  } catch (err) {
    return sendError(res, 'INVALID_REQUEST', `Could not read the Excel file: ${err.message}`, 400);
  }
  if (rows.length === 0) {
    return sendError(res, 'INVALID_REQUEST', 'The sheet appears to be empty', 400);
  }
  try {
    const results = await stockItemService.bulkUpsertStockItems(rows);
    const summary = {
      totalRows: rows.length,
      createdCount: results.created.length,
      updatedCount: results.updated.length,
      failedCount: results.failed.length,
      created: results.created,
      updated: results.updated,
      failed: results.failed,
      note: 'MRP is returned above but NOT written to Tally — please store it in the website catalog directly.',
    };
    return sendSuccess(res, summary, 200);
  } catch (err) {
    return sendError(res, 'TALLY_UNAVAILABLE', err.message);
  }
}

module.exports = { listStockItems, createStockItem, updateStockItem, bulkUpload };