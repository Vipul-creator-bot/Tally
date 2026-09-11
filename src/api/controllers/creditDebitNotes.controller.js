const noteService = require('../../services/creditDebitNoteService');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function createCreditOrDebitNote(req, res) {
  const { noteType, partyLedgerName, voucherNumber, date, isInterState, items } = req.body;

  if (!['Credit Note', 'Debit Note'].includes(noteType)) {
    return sendError(res, 'INVALID_REQUEST', 'noteType must be "Credit Note" or "Debit Note"', 400);
  }
  if (!partyLedgerName || !voucherNumber || !date || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'INVALID_REQUEST', 'partyLedgerName, voucherNumber, date, and a non-empty items array are required', 400);
  }
  for (const item of items) {
    if (!item.name || !item.quantity || item.rate == null || item.gstRate == null) {
      return sendError(res, 'INVALID_REQUEST', 'Each item requires name, quantity, rate, and gstRate', 400);
    }
  }

  try {
    const result = await noteService.createCreditOrDebitNote({
      noteType, partyLedgerName, voucherNumber, date, isInterState: !!isInterState, items,
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    const code = err.code || 'TALLY_UNAVAILABLE';
    const statusMap = { TALLY_VALIDATION_ERROR: 422, DUPLICATE_VOUCHER: 409 };
    return sendError(res, code, err.message, statusMap[code] || 502);
  }
}

module.exports = { createCreditOrDebitNote };