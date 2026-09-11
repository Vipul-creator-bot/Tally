// GSTIN format + checksum validation (Luhn mod 36) — the same algorithm
// we manually verified worked when debugging Create Customer Ledger earlier.
const CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function computeChecksum(first14Chars) {
  let factor = 1;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const code = CODE_CHARS.indexOf(first14Chars[i]);
    const product = code * factor;
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checksumCode = (36 - (sum % 36)) % 36;
  return CODE_CHARS[checksumCode];
}

function validateGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') {
    return { valid: false, reason: 'GSTIN is missing' };
  }
  const value = gstin.trim().toUpperCase();

  const formatRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (!formatRegex.test(value)) {
    return { valid: false, reason: 'GSTIN format is invalid — expected 15 characters (2-digit state code, 10-char PAN, entity code, "Z", checksum)' };
  }

  const expectedChecksum = computeChecksum(value.substring(0, 14));
  const actualChecksum = value[14];
  if (expectedChecksum !== actualChecksum) {
    return { valid: false, reason: `GSTIN checksum is incorrect (expected "${expectedChecksum}", got "${actualChecksum}") — likely a typo` };
  }

  return { valid: true, stateCode: value.substring(0, 2) };
}

module.exports = { validateGSTIN };