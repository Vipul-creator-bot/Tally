const customerService = require('../../services/customerService');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function listCustomers(req, res) {
  try {
    const customers = await customerService.listCustomers();
    return sendSuccess(res, customers);
  } catch (err) {
    return sendError(res, 'TALLY_UNAVAILABLE', err.message);
  }
}

async function createCustomer(req, res) {
  const { name, gstin, state, country, pincode, openingBalance } = req.body;

  if (!name) {
    return sendError(res, 'INVALID_REQUEST', 'Customer "name" is required', 400);
  }

  try {
    const result = await customerService.createCustomer({
      name, gstin, state, country, pincode, openingBalance,
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    const code = err.code || 'TALLY_UNAVAILABLE';
    const statusMap = { TALLY_VALIDATION_ERROR: 422, INVALID_GSTIN: 400 };
    return sendError(res, code, err.message, statusMap[code] || 502);
  }
}
async function updateCustomer(req, res) {
  const existingName = req.params.name;
  const { name, gstin, state, country, pincode, openingBalance } = req.body;

  try {
    const result = await customerService.updateCustomer(existingName, {
      name, gstin, state, country, pincode, openingBalance,
    });
    return sendSuccess(res, result);
  } catch (err) {
    const code = err.code || 'TALLY_UNAVAILABLE';
    const statusMap = { TALLY_VALIDATION_ERROR: 422, INVALID_GSTIN: 400 };
    return sendError(res, code, err.message, statusMap[code] || 502);
  }
}


async function getLedgerBalance(req, res) {
  try {
    const result = await customerService.getLedgerBalance(req.params.name);
    return sendSuccess(res, result);
  } catch (err) {
    const code = err.code || 'TALLY_UNAVAILABLE';
    return sendError(res, code, err.message, code === 'NOT_FOUND' ? 404 : 502);
  }
}
module.exports = { listCustomers, createCustomer, updateCustomer, getLedgerBalance };