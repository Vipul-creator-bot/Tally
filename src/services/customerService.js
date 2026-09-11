const { XMLParser } = require('fast-xml-parser');
const { sendToTally } = require('../integration/tallyClient');
const {
  listOfLedgersRequest,
  listOfLedgersDetailedRequest,
  createCustomerLedgerRequest,
  updateCustomerLedgerRequest,
  createLedgerGroupRequest,
} = require('../integration/xmlTemplates');
const { validateGSTIN } = require('../utils/gstinValidator');
const { companyName } = require('../config/tally.config');

const WEBSITE_CUSTOMER_GROUP = 'Website Customer';
const FIRM_CUSTOMER_GROUP = 'Regular';
const PERSONAL_CUSTOMER_GROUP = 'Consumer';

// Best-effort, one-time-per-server-run group setup — same pattern as
// ensureStockGroupExists in purchaseService.js. Safe to call on every
// customer creation; only actually sends the 3 create-group requests
// once per server process.
let websiteGroupsEnsured = false;
async function ensureWebsiteCustomerGroups() {
  if (websiteGroupsEnsured) return;
  websiteGroupsEnsured = true;
  try {
    await sendToTally(createLedgerGroupRequest(companyName, WEBSITE_CUSTOMER_GROUP, 'Sundry Debtors'));
    await sendToTally(createLedgerGroupRequest(companyName, FIRM_CUSTOMER_GROUP, WEBSITE_CUSTOMER_GROUP));
    await sendToTally(createLedgerGroupRequest(companyName, PERSONAL_CUSTOMER_GROUP, WEBSITE_CUSTOMER_GROUP));
  } catch (err) {
    // best-effort — if the groups already exist, that's fine
  }
}

function getText(node) {
  if (node == null) return null;
  if (typeof node === 'object' && '#text' in node) return node['#text'];
  return node;
}

async function listCustomers() {
  const xmlRequest = listOfLedgersRequest(companyName);
  const rawXml = await sendToTally(xmlRequest);
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(rawXml);

  const raw = parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION?.LEDGER;
  if (!raw) return [];
  const ledgers = Array.isArray(raw) ? raw : [raw];
  return ledgers.map((l) => ({ name: l['@_NAME'] }));
}

async function createCustomer(customer) {
  if (customer.gstin) {
    const validation = validateGSTIN(customer.gstin);
    if (!validation.valid) {
      const err = new Error(`Invalid GSTIN: ${validation.reason}`);
      err.code = 'INVALID_GSTIN';
      throw err;
    }
  }

  // B2B/B2C routing: a GSTIN means a firm buying for business use — goes
  // under Firm Customers. No GSTIN means an individual buying for personal
  // use — goes under Personal Customers. Both sit under Website Customer,
  // itself under Sundry Debtors, per the client's confirmed structure.
  await ensureWebsiteCustomerGroups();
  const parentGroup = customer.gstin ? FIRM_CUSTOMER_GROUP : PERSONAL_CUSTOMER_GROUP;

  const xmlRequest = createCustomerLedgerRequest(companyName, { ...customer, parentGroup });
  const rawXml = await sendToTally(xmlRequest);

  const lineErrorMatch = rawXml.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
  if (lineErrorMatch && lineErrorMatch[1]) {
    const err = new Error(lineErrorMatch[1]);
    err.code = 'TALLY_VALIDATION_ERROR';
    throw err;
  }

  const created = rawXml.includes('<CREATED>1</CREATED>');
  const altered = rawXml.includes('<ALTERED>1</ALTERED>');
  if (!created && !altered) {
    throw new Error('Tally did not confirm the customer was saved');
  }

  return { name: customer.name, status: created ? 'created' : 'updated', customerType: customer.gstin ? 'Firm' : 'Personal' };
}

async function updateCustomer(existingName, customer) {
  if (customer.gstin) {
    const validation = validateGSTIN(customer.gstin);
    if (!validation.valid) {
      const err = new Error(`Invalid GSTIN: ${validation.reason}`);
      err.code = 'INVALID_GSTIN';
      throw err;
    }
  }

  // Same routing on update — e.g. if a personal customer later adds a
  // GSTIN, they move into Firm Customers automatically.
  await ensureWebsiteCustomerGroups();
  const parentGroup = customer.gstin ? FIRM_CUSTOMER_GROUP : PERSONAL_CUSTOMER_GROUP;

  const xmlRequest = updateCustomerLedgerRequest(companyName, existingName, { ...customer, parentGroup });
  const rawXml = await sendToTally(xmlRequest);

  const lineErrorMatch = rawXml.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
  if (lineErrorMatch && lineErrorMatch[1]) {
    const err = new Error(lineErrorMatch[1]);
    err.code = 'TALLY_VALIDATION_ERROR';
    throw err;
  }

  const altered = rawXml.includes('<ALTERED>1</ALTERED>');
  const created = rawXml.includes('<CREATED>1</CREATED>');
  if (!altered && !created) {
    throw new Error('Tally did not confirm the customer was updated');
  }

  return { name: customer.name || existingName, status: 'updated', customerType: customer.gstin ? 'Firm' : 'Personal' };
}

async function getLedgerBalance(ledgerName) {
  const xmlRequest = listOfLedgersDetailedRequest(companyName);
  const rawXml = await sendToTally(xmlRequest);
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(rawXml);

  const raw = parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION?.LEDGER;
  const ledgers = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = ledgers.find((l) => l['@_NAME'] === ledgerName);

  if (!match) {
    const err = new Error(`Ledger "${ledgerName}" not found`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  const rawBalance = getText(match.CLOSINGBALANCE) ?? 0;

  return {
    name: match['@_NAME'],
    parent: getText(match.PARENT),
    closingBalance: Math.abs(rawBalance),
    balanceType: rawBalance < 0 ? 'Debit' : 'Credit',
    billWiseDetailsAvailable: false,
  };
}

module.exports = { listCustomers, createCustomer, updateCustomer, getLedgerBalance };