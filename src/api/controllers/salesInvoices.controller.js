const salesInvoiceService = require('../../services/salesInvoiceService');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function createSalesInvoice(req, res) {
  const { customerName, voucherNumber, date, isInterState, items, creditLimit } = req.body;

  if (!customerName || !voucherNumber || !date || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'INVALID_REQUEST', 'customerName, voucherNumber, date, and a non-empty items array are required', 400);
  }
  for (const item of items) {
    if (!item.name || !item.quantity || item.rate == null || item.gstRate == null) {
      return sendError(res, 'INVALID_REQUEST', 'Each item requires name, quantity, rate, and gstRate', 400);
    }
  }

  try {
        const result = await salesInvoiceService.createSalesInvoice({
      customerName, voucherNumber, date, isInterState: !!isInterState, items, creditLimit,
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    const code = err.code || 'TALLY_UNAVAILABLE';
    // const statusMap = { TALLY_VALIDATION_ERROR: 422, DUPLICATE_VOUCHER: 409 };
    const statusMap = { TALLY_VALIDATION_ERROR: 422, DUPLICATE_VOUCHER: 409, INSUFFICIENT_STOCK: 409 };
    return sendError(res, code, err.message, statusMap[code] || 502);
  }
}

module.exports = { createSalesInvoice };