const purchaseService = require('../../services/purchaseService');
const { parsePurchaseBillExcel } = require('../../utils/excelParser');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function bulkUpload(req, res) {
  if (!req.file) {
    return sendError(res, 'INVALID_REQUEST', 'No file uploaded — send the Excel file as form-data field "file"', 400);
  }
  let rows;
  try {
    rows = parsePurchaseBillExcel(req.file.buffer);
  } catch (err) {
    return sendError(res, 'INVALID_REQUEST', `Could not read the Excel file: ${err.message}`, 400);
  }
  if (rows.length === 0) {
    return sendError(res, 'INVALID_REQUEST', 'The sheet appears to be empty', 400);
  }
  try {
    const results = await purchaseService.bulkUploadPurchaseBills(rows);
    const summary = {
      totalBills: results.billsCreated.length + results.billsFailed.length,
      createdCount: results.billsCreated.length,
      failedCount: results.billsFailed.length,
      created: results.billsCreated,
      failed: results.billsFailed,
    };
    if (results.hasUnmappedMrp) {
      summary.note = 'One or more rows had an MRP value — NOT currently written to Tally, pending client confirmation of where it should live.';
    }
    return sendSuccess(res, summary, 200);
  } catch (err) {
    return sendError(res, 'TALLY_UNAVAILABLE', err.message);
  }
}

module.exports = { bulkUpload };