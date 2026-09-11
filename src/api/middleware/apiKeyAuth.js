const config = require('../../config/tally.config');

// Every request to /api/v1/* must include this header:
//   X-API-Key: <the value from .env>
// Right now this is the ONLY thing standing between the internet and
// creating real invoices/vouchers in Tally — treat it as load-bearing.
function apiKeyAuth(req, res, next) {
  if (!config.apiKey) {
    console.error('SECURITY WARNING: API_KEY is not set in .env — rejecting all requests until it is.');
    return res.status(500).json({ success: false, error: { code: 'SERVER_MISCONFIGURED', message: 'API key not configured on server' } });
  }

  const providedKey = req.headers['x-api-key'];
  if (!providedKey || providedKey !== config.apiKey) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid API key' } });
  }

  next();
}

module.exports = { apiKeyAuth };