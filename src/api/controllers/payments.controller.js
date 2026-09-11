const paymentService = require('../../services/paymentService');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function createPaymentOrReceipt(req, res) {
  const { voucherType, partyLedgerName, cashBankLedgerName, amount, voucherNumber, date, narration } = req.body;

  if (!['Payment', 'Receipt'].includes(voucherType)) {
    return sendError(res, 'INVALID_REQUEST', 'voucherType must be "Payment" or "Receipt"', 400);
  }
  if (!partyLedgerName || !cashBankLedgerName || !amount || !voucherNumber || !date) {
    return sendError(res, 'INVALID_REQUEST', 'partyLedgerName, cashBankLedgerName, amount, voucherNumber, and date are required', 400);
  }

  try {
    const result = await paymentService.createPaymentOrReceipt({
      voucherType, partyLedgerName, cashBankLedgerName, amount, voucherNumber, date, narration,
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    const code = err.code || 'TALLY_UNAVAILABLE';
    const statusMap = { TALLY_VALIDATION_ERROR: 422, DUPLICATE_VOUCHER: 409 };
    return sendError(res, code, err.message, statusMap[code] || 502);
  }
}

module.exports = { createPaymentOrReceipt };