// Consistent response shape for every endpoint — the Angular dev always
// gets { success, data } or { success: false, error: { code, message } },
// never raw Tally XML/errors.
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function sendError(res, code, message, statusCode = 502) {
  return res.status(statusCode).json({ success: false, error: { code, message } });
}

module.exports = { sendSuccess, sendError };