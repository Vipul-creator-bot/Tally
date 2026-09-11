const axios = require('axios');
const { tallyUrl } = require('../config/tally.config');

/**
 * Sends a raw XML request to Tally's HTTP gateway. This is the single
 * choke point for all Tally communication — every service in the
 * project calls through here, so this retry logic applies everywhere
 * automatically with no other file changes needed.
 *
 * Retries ONLY on genuine network failures (no response received at
 * all — e.g. a dropped tunnel, timeout, connection refused). Never
 * retries when Tally actually responded with something, even an error
 * — that's a definitive answer, not a transient glitch, and blindly
 * retrying a real rejection risks creating duplicate financial entries.
 */
async function sendToTally(xmlRequest, options = {}) {
  const { maxRetries = 2, retryDelayMs = 1000 } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const timestamp = new Date().toISOString();
    try {
      if (attempt > 0) {
        console.log(`\n[${timestamp}] Retrying (attempt ${attempt + 1} of ${maxRetries + 1}) after a network failure...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
      }

      console.log(`\n[${timestamp}] --> Sending to Tally (attempt ${attempt + 1}):`);
      console.log(xmlRequest.substring(0, 1500));

      const response = await axios.post(tallyUrl, xmlRequest, {
        headers: {
          'Content-Type': 'text/xml',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 20000,
      });

      console.log(`[${timestamp}] <-- Tally responded:`);
      console.log(String(response.data).substring(0, 1500));
      console.log('');

      return response.data;
    } catch (err) {
      lastError = err;
      const isTransientNetworkFailure = !err.response; // no response = never reached Tally, or reply never came back

      console.error(`[${timestamp}] Request failed (attempt ${attempt + 1}): ${err.message}`);

      if (!isTransientNetworkFailure) {
        throw err; // Tally answered with something real — don't retry, surface it immediately
      }
      if (attempt === maxRetries) {
        throw new Error(`Tally unreachable after ${maxRetries + 1} attempts: ${lastError.message}`);
      }
    }
  }
}

module.exports = {
  sendToTally,
};