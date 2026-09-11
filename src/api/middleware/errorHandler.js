// Catches anything that slips past a controller's own try/catch —
// last line of defense so the client never sees a raw stack trace.
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}

module.exports = { errorHandler };