// TEMPORARY in-memory duplicate check. This resets if the server restarts,
// and won't work if this ever runs as more than one server instance —
// a real fix needs a database (still on the roadmap, tracker row 22/26).
// For now, this catches the common real-world case: a network retry or a
// double-click sending the same voucher number twice while the server is up.
const processed = new Set();

function hasBeenProcessed(voucherType, key) {
  return processed.has(`${voucherType}:${key}`);
}

function markProcessed(voucherType, key) {
  processed.add(`${voucherType}:${key}`);
}

module.exports = { hasBeenProcessed, markProcessed };