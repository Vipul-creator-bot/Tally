const voucherService = require('../../services/voucherService');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function getVoucherStatus(req, res) {
  const { voucherNumber } = req.params;
  const { voucherType } = req.query;

  try {
    const matches = await voucherService.getVoucherStatus(voucherNumber, voucherType);
    if (matches.length === 0) {
      return sendError(res, 'NOT_FOUND', `No voucher found with number "${voucherNumber}"${voucherType ? ` of type "${voucherType}"` : ''}`, 404);
    }
    return sendSuccess(res, matches);
  } catch (err) {
    return sendError(res, 'TALLY_UNAVAILABLE', err.message);
  }
}

module.exports = { getVoucherStatus };