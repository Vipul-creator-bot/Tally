require('dotenv').config();

module.exports = {
  tallyUrl: process.env.TALLY_URL || 'http://localhost:9000',
  companyName: process.env.TALLY_COMPANY || '',
  salesLedgerName: process.env.TALLY_SALES_LEDGER || 'Sales',
  purchaseLedgerName: process.env.TALLY_PURCHASE_LEDGER || 'Purchase',
  cgstOutputLedgerName: process.env.TALLY_CGST_OUTPUT_LEDGER || 'CGST',
  sgstOutputLedgerName: process.env.TALLY_SGST_OUTPUT_LEDGER || 'SGST',
  igstOutputLedgerName: process.env.TALLY_IGST_OUTPUT_LEDGER || 'IGST',
  cgstInputLedgerName: process.env.TALLY_CGST_INPUT_LEDGER || 'CGST',
  sgstInputLedgerName: process.env.TALLY_SGST_INPUT_LEDGER || 'SGST',
  igstInputLedgerName: process.env.TALLY_IGST_INPUT_LEDGER || 'IGST',
  apiKey: process.env.API_KEY || '',
};