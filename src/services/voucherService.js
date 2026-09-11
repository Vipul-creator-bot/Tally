const { XMLParser } = require('fast-xml-parser');
const { sendToTally } = require('../integration/tallyClient');
const { listOfVouchersRequest } = require('../integration/xmlTemplates');
const { companyName } = require('../config/tally.config');

function getText(node) {
  if (node == null) return null;
  if (typeof node === 'object' && '#text' in node) return node['#text'];
  return node;
}

async function getVoucherStatus(voucherNumber, voucherType) {
  // Covers this sandbox's whole financial year — widen if ever needed
  const xmlRequest = listOfVouchersRequest(companyName, '20260401', '20270331');
  const rawXml = await sendToTally(xmlRequest);
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(rawXml);

  const raw = parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION?.VOUCHER;
  const vouchers = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const matches = vouchers.filter((v) => {
    const num = String(getText(v.VOUCHERNUMBER));
    const type = getText(v.VOUCHERTYPENAME);
    if (num !== String(voucherNumber)) return false;
    if (voucherType && type !== voucherType) return false;
    return true;
  });

  return matches.map((v) => ({
    voucherNumber: getText(v.VOUCHERNUMBER),
    voucherType: getText(v.VOUCHERTYPENAME),
    date: getText(v.DATE),
    partyLedgerName: getText(v.PARTYLEDGERNAME),
    amount: Math.abs(getText(v.AMOUNT) ?? 0),
    isCancelled: getText(v.ISCANCELLED) === 'Yes',
  }));
}

module.exports = { getVoucherStatus };