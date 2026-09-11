/**
 * Tally XML request builders.
 *
 * CONFIRMED WORKING against both the Khurana Test Co sandbox and the
 * real KHURANA KITCHENWARE PRIVATE LIMITED company data. Key confirmed
 * rule for all write (Import Data) requests: use ACTION in uppercase,
 * and always include a NAME.LIST > NAME block inside the master tag,
 * in addition to the NAME attribute — Tally rejects requests missing
 * either of these into <EXCEPTIONS> with no other error detail.
 *
 * SIGN CONVENTION — proven universally: NEGATIVE = Debit, POSITIVE =
 * Credit, regardless of ledger group. Our API always accepts plain,
 * positive numbers from the caller — the flip happens internally.
 *
 * XML ESCAPING — every dynamic string value (names, addresses,
 * narrations, item descriptions, etc.) passes through escapeXml()
 * before being placed inside XML tags. Real business names commonly
 * contain "&" (e.g. "R & K Enterprises"), and real product names have
 * been observed containing embedded special characters — without
 * escaping, these produce malformed XML that Tally silently mishandles.
 */

function escapeXml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function listOfLedgersRequest(companyName) {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>List of Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

function listOfStockItemsRequest(companyName) {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>List of Stock Items</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

function listOfStockItemsDetailedRequest(companyName) {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>List of Stock Items</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="List of Stock Items" ISMODIFY="Yes">
            <FETCH>NAME</FETCH>
            <FETCH>PARENT</FETCH>
            <FETCH>BASEUNITS</FETCH>
            <FETCH>OPENINGBALANCE</FETCH>
            <FETCH>OPENINGVALUE</FETCH>
            <FETCH>GSTAPPLICABLE</FETCH>
            <FETCH>HSNDETAILS.LIST</FETCH>
            <FETCH>GSTDETAILS.LIST</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

function createCustomerLedgerRequest(companyName, customer) {
  const {
    name,
    parentGroup = 'Sundry Debtors',
    gstin = '',
    state = 'Haryana',
    country = 'India',
    pincode = '122001',
    openingBalance = 0,
  } = customer;

  const signedOpeningBalance = parentGroup === 'Sundry Creditors' ? openingBalance : -openingBalance;
  const safeName = escapeXml(name);

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${safeName}" ACTION="Create">
            <NAME.LIST>
              <NAME>${safeName}</NAME>
            </NAME.LIST>
            <PARENT>${escapeXml(parentGroup)}</PARENT>
            <OPENINGBALANCE>${signedOpeningBalance}</OPENINGBALANCE>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <COUNTRYNAME>${escapeXml(country)}</COUNTRYNAME>
            <LEDSTATENAME>${escapeXml(state)}</LEDSTATENAME>
            <PINCODE>${escapeXml(pincode)}</PINCODE>
            <GSTREGISTRATIONTYPE>${gstin ? 'Regular' : 'Unregistered/Consumer'}</GSTREGISTRATIONTYPE>
            <PARTYGSTIN>${escapeXml(gstin)}</PARTYGSTIN>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function createStockItemRequest(companyName, item) {
  const {
    name,
    alias = '',
    parentGroup = '',
    baseUnit = 'Nos',
    hsnCode,
    gstRate,
    openingQuantity = 0,
    openingValue = 0,
  } = item;

  const halfRate = gstRate / 2;
  const safeName = escapeXml(name);
  const parentTag = parentGroup ? `<PARENT>${escapeXml(parentGroup)}</PARENT>` : '';
  const aliasTag = alias ? `<NAME>${escapeXml(alias)}</NAME>` : '';

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="${safeName}" ACTION="Create">
            <NAME.LIST>
              <NAME>${safeName}</NAME>
              ${aliasTag}
            </NAME.LIST>
            ${parentTag}
            <BASEUNITS>${escapeXml(baseUnit)}</BASEUNITS>
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <HSNDETAILS.LIST>
              <HSNCODE>${escapeXml(hsnCode)}</HSNCODE>
              <SRCOFHSNDETAILS>Specify Details Here</SRCOFHSNDETAILS>
            </HSNDETAILS.LIST>
            <GSTDETAILS.LIST>
              <TAXABILITY>Taxable</TAXABILITY>
              <SRCOFGSTDETAILS>Specify Details Here</SRCOFGSTDETAILS>
              <STATEWISEDETAILS.LIST>
                <STATENAME>Any</STATENAME>
                <RATEDETAILS.LIST>
                  <GSTRATEDUTYHEAD>CGST</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                  <GSTRATE>${halfRate}</GSTRATE>
                </RATEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <GSTRATEDUTYHEAD>SGST/UTGST</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                  <GSTRATE>${halfRate}</GSTRATE>
                </RATEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                  <GSTRATE>${gstRate}</GSTRATE>
                </RATEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <GSTRATEDUTYHEAD>Cess</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Not Applicable</GSTRATEVALUATIONTYPE>
                </RATEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <GSTRATEDUTYHEAD>State Cess</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                </RATEDETAILS.LIST>
              </STATEWISEDETAILS.LIST>
            </GSTDETAILS.LIST>
            <OPENINGBALANCE>${openingQuantity} ${escapeXml(baseUnit)}</OPENINGBALANCE>
            <OPENINGVALUE>${openingValue}</OPENINGVALUE>
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function createStockGroupRequest(companyName, groupName) {
  const safeName = escapeXml(groupName);
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKGROUP NAME="${safeName}" ACTION="Create">
            <NAME.LIST>
              <NAME>${safeName}</NAME>
            </NAME.LIST>
          </STOCKGROUP>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function updateCustomerLedgerRequest(companyName, existingName, customer) {
  const {
    name = existingName,
    parentGroup = 'Sundry Debtors',
    gstin = '',
    state = 'Haryana',
    country = 'India',
    pincode = '122001',
    openingBalance = 0,
  } = customer;

  const signedOpeningBalance = parentGroup === 'Sundry Creditors' ? openingBalance : -openingBalance;

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXml(existingName)}" ACTION="Alter">
            <NAME.LIST>
              <NAME>${escapeXml(name)}</NAME>
            </NAME.LIST>
            <PARENT>${escapeXml(parentGroup)}</PARENT>
            <OPENINGBALANCE>${signedOpeningBalance}</OPENINGBALANCE>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <COUNTRYNAME>${escapeXml(country)}</COUNTRYNAME>
            <LEDSTATENAME>${escapeXml(state)}</LEDSTATENAME>
            <PINCODE>${escapeXml(pincode)}</PINCODE>
            <GSTREGISTRATIONTYPE>${gstin ? 'Regular' : 'Unregistered/Consumer'}</GSTREGISTRATIONTYPE>
            <PARTYGSTIN>${escapeXml(gstin)}</PARTYGSTIN>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function updateStockItemRequest(companyName, existingName, item) {
  const {
    name = existingName,
    alias = '',
    parentGroup = '',
    baseUnit = 'Nos',
    hsnCode,
    gstRate = 0,
    openingQuantity = 0,
    openingValue = 0,
  } = item;

  const halfRate = gstRate / 2;
  const parentTag = parentGroup ? `<PARENT>${escapeXml(parentGroup)}</PARENT>` : '';
  const aliasTag = alias ? `<NAME>${escapeXml(alias)}</NAME>` : '';

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="${escapeXml(existingName)}" ACTION="Alter">
            <NAME.LIST>
              <NAME>${escapeXml(name)}</NAME>
              ${aliasTag}
            </NAME.LIST>
            ${parentTag}
            <BASEUNITS>${escapeXml(baseUnit)}</BASEUNITS>
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <HSNDETAILS.LIST>
              <APPLICABLEFROM>20260401</APPLICABLEFROM>
              <HSNCODE>${escapeXml(hsnCode)}</HSNCODE>
              <SRCOFHSNDETAILS>Specify Details Here</SRCOFHSNDETAILS>
            </HSNDETAILS.LIST>
            <GSTDETAILS.LIST>
              <APPLICABLEFROM>20260401</APPLICABLEFROM>
              <TAXABILITY>Taxable</TAXABILITY>
              <SRCOFGSTDETAILS>Specify Details Here</SRCOFGSTDETAILS>
              <STATEWISEDETAILS.LIST>
                <STATENAME>Any</STATENAME>
                              <RATEDETAILS.LIST>
                  <APPLICABLEFROM>20260401</APPLICABLEFROM>
                  <GSTRATEDUTYHEAD>CGST</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                  <GSTRATE>${halfRate}</GSTRATE>
                </RATEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <APPLICABLEFROM>20260401</APPLICABLEFROM>
                  <GSTRATEDUTYHEAD>SGST/UTGST</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                  <GSTRATE>${halfRate}</GSTRATE>
                </RATEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <APPLICABLEFROM>20260401</APPLICABLEFROM>
                  <GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                  <GSTRATE>${gstRate}</GSTRATE>
                </RATEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <GSTRATEDUTYHEAD>Cess</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Not Applicable</GSTRATEVALUATIONTYPE>
                </RATEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <GSTRATEDUTYHEAD>State Cess</GSTRATEDUTYHEAD>
                  <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                </RATEDETAILS.LIST>
              </STATEWISEDETAILS.LIST>
            </GSTDETAILS.LIST>
            <OPENINGBALANCE>${openingQuantity} ${escapeXml(baseUnit)}</OPENINGBALANCE>
            <OPENINGVALUE>${openingValue}</OPENINGVALUE>
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function createSalesInvoiceRequest(companyName, invoice, ledgerNames) {
  const { customerName, voucherNumber, date, isInterState = false, items } = invoice;
  const { salesLedgerName, cgstLedgerName, sgstLedgerName, igstLedgerName } = ledgerNames;
  const safeCustomerName = escapeXml(customerName);

  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const inventoryEntries = items.map((item) => {
    const { name, quantity, rate, unit = 'Nos', gstRate } = item;
    const amount = round2(quantity * rate);
    subtotal += amount;

    if (isInterState) {
      totalIgst += round2((amount * gstRate) / 100);
    } else {
      const halfRate = gstRate / 2;
      totalCgst += round2((amount * halfRate) / 100);
      totalSgst += round2((amount * halfRate) / 100);
    }

    return `            <INVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${escapeXml(name)}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <RATE>${rate}/${escapeXml(unit)}</RATE>
              <AMOUNT>${amount.toFixed(2)}</AMOUNT>
              <ACTUALQTY>${quantity} ${escapeXml(unit)}</ACTUALQTY>
              <BILLEDQTY>${quantity} ${escapeXml(unit)}</BILLEDQTY>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${escapeXml(salesLedgerName)}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>${amount.toFixed(2)}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>Main Location</GODOWNNAME>
                <BATCHNAME>Primary Batch</BATCHNAME>
                <AMOUNT>${amount.toFixed(2)}</AMOUNT>
                <ACTUALQTY>${quantity} ${escapeXml(unit)}</ACTUALQTY>
                <BILLEDQTY>${quantity} ${escapeXml(unit)}</BILLEDQTY>
              </BATCHALLOCATIONS.LIST>
            </INVENTORYENTRIES.LIST>`;
  }).join('\n');

  const totalTax = round2(totalCgst + totalSgst + totalIgst);
  const grandTotal = round2(subtotal + totalTax);

  const taxEntries = [];
  if (totalCgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(cgstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${totalCgst.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }
  if (totalSgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(sgstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${totalSgst.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }
  if (totalIgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(igstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${totalIgst.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(voucherNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${safeCustomerName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${safeCustomerName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>-${grandTotal.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>
${inventoryEntries}
${taxEntries.join('\n')}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function createPurchaseVoucherRequest(companyName, bill, ledgerNames) {
  const { vendorName, billNumber, date, isInterState = false, items } = bill;
  const { purchaseLedgerName, cgstLedgerName, sgstLedgerName, igstLedgerName } = ledgerNames;
  const safeVendorName = escapeXml(vendorName);

  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const inventoryEntries = items.map((item) => {
    const { name, quantity, rate, unit = 'Nos' } = item;
    const amount = round2(quantity * rate);
    subtotal += amount;

    if (isInterState) {
      totalIgst += round2((amount * item.gstRate) / 100);
    } else {
      const halfRate = item.gstRate / 2;
      totalCgst += round2((amount * halfRate) / 100);
      totalSgst += round2((amount * halfRate) / 100);
    }

    return `            <INVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${escapeXml(name)}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <RATE>${rate}/${escapeXml(unit)}</RATE>
              <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
              <ACTUALQTY>${quantity} ${escapeXml(unit)}</ACTUALQTY>
              <BILLEDQTY>${quantity} ${escapeXml(unit)}</BILLEDQTY>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${escapeXml(purchaseLedgerName)}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>Main Location</GODOWNNAME>
                <BATCHNAME>Primary Batch</BATCHNAME>
                <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
                <ACTUALQTY>${quantity} ${escapeXml(unit)}</ACTUALQTY>
                <BILLEDQTY>${quantity} ${escapeXml(unit)}</BILLEDQTY>
              </BATCHALLOCATIONS.LIST>
            </INVENTORYENTRIES.LIST>`;
  }).join('\n');

  const totalTax = round2(totalCgst + totalSgst + totalIgst);
  const grandTotal = round2(subtotal + totalTax);

  const taxEntries = [];
  if (totalCgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(cgstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalCgst.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }
  if (totalSgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(sgstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalSgst.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }
  if (totalIgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(igstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${totalIgst.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(billNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${safeVendorName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${safeVendorName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${grandTotal.toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>
${inventoryEntries}
${taxEntries.join('\n')}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function createPaymentOrReceiptRequest(companyName, voucher) {
  const { voucherType, partyLedgerName, cashBankLedgerName, amount, voucherNumber, date, narration = '' } = voucher;
  const isPayment = voucherType === 'Payment';

  const partyIsDeemedPositive = isPayment ? 'Yes' : 'No';
  const partyAmount = isPayment ? `-${amount.toFixed(2)}` : amount.toFixed(2);
  const cashIsDeemedPositive = isPayment ? 'No' : 'Yes';
  const cashAmount = isPayment ? amount.toFixed(2) : `-${amount.toFixed(2)}`;
  const safePartyName = escapeXml(partyLedgerName);

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${voucherType}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(voucherNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${safePartyName}</PARTYLEDGERNAME>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${safePartyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${partyIsDeemedPositive}</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${partyAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(cashBankLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${cashIsDeemedPositive}</ISDEEMEDPOSITIVE>
              <AMOUNT>${cashAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function listOfLedgersDetailedRequest(companyName) {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>List of Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="List of Ledgers" ISMODIFY="Yes">
            <FETCH>NAME</FETCH>
            <FETCH>PARENT</FETCH>
            <FETCH>CLOSINGBALANCE</FETCH>
            <FETCH>BILLALLOCATIONS.LIST</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

function createCreditOrDebitNoteRequest(companyName, note, ledgerNames) {
  const { noteType, partyLedgerName, voucherNumber, date, isInterState = false, items } = note;
  const { salesOrPurchaseLedgerName, cgstLedgerName, sgstLedgerName, igstLedgerName } = ledgerNames;
  const isCredit = noteType === 'Credit Note';
  const safePartyName = escapeXml(partyLedgerName);

  const inventoryIsDeemedPositive = isCredit ? 'Yes' : 'No';
  const inventorySign = isCredit ? -1 : 1;

  const partyIsDeemedPositive = isCredit ? 'No' : 'Yes';
  const partySign = isCredit ? 1 : -1;

  const reverseIsDeemedPositive = isCredit ? 'Yes' : 'No';
  const reverseSign = isCredit ? -1 : 1;

  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const inventoryEntries = items.map((item) => {
    const { name, quantity, rate, unit = 'Nos', gstRate } = item;
    const amount = round2(quantity * rate);
    subtotal += amount;

    if (isInterState) {
      totalIgst += round2((amount * gstRate) / 100);
    } else {
      const halfRate = gstRate / 2;
      totalCgst += round2((amount * halfRate) / 100);
      totalSgst += round2((amount * halfRate) / 100);
    }

    const signedAmount = (inventorySign * amount).toFixed(2);
    return `            <INVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${escapeXml(name)}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>${inventoryIsDeemedPositive}</ISDEEMEDPOSITIVE>
              <RATE>${rate}/${escapeXml(unit)}</RATE>
              <AMOUNT>${signedAmount}</AMOUNT>
              <ACTUALQTY>${quantity} ${escapeXml(unit)}</ACTUALQTY>
              <BILLEDQTY>${quantity} ${escapeXml(unit)}</BILLEDQTY>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${escapeXml(salesOrPurchaseLedgerName)}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>${reverseIsDeemedPositive}</ISDEEMEDPOSITIVE>
                <AMOUNT>${(reverseSign * amount).toFixed(2)}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>Main Location</GODOWNNAME>
                <BATCHNAME>Primary Batch</BATCHNAME>
                <AMOUNT>${signedAmount}</AMOUNT>
                <ACTUALQTY>${quantity} ${escapeXml(unit)}</ACTUALQTY>
                <BILLEDQTY>${quantity} ${escapeXml(unit)}</BILLEDQTY>
              </BATCHALLOCATIONS.LIST>
            </INVENTORYENTRIES.LIST>`;
  }).join('\n');

  const totalTax = round2(totalCgst + totalSgst + totalIgst);
  const grandTotal = round2(subtotal + totalTax);

  const taxEntries = [];
  if (totalCgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(cgstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${reverseIsDeemedPositive}</ISDEEMEDPOSITIVE>
              <AMOUNT>${(reverseSign * totalCgst).toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }
  if (totalSgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(sgstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${reverseIsDeemedPositive}</ISDEEMEDPOSITIVE>
              <AMOUNT>${(reverseSign * totalSgst).toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }
  if (totalIgst > 0) {
    taxEntries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(igstLedgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${reverseIsDeemedPositive}</ISDEEMEDPOSITIVE>
              <AMOUNT>${(reverseSign * totalIgst).toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
  }

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${noteType}" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>${noteType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(voucherNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${safePartyName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${safePartyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${partyIsDeemedPositive}</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${(partySign * grandTotal).toFixed(2)}</AMOUNT>
            </LEDGERENTRIES.LIST>
${inventoryEntries}
${taxEntries.join('\n')}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function listOfVouchersRequest(companyName, fromDate, toDate) {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>VoucherStatusQuery</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="VoucherStatusQuery" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE</FETCH>
            <FETCH>VOUCHERNUMBER</FETCH>
            <FETCH>VOUCHERTYPENAME</FETCH>
            <FETCH>PARTYLEDGERNAME</FETCH>
            <FETCH>AMOUNT</FETCH>
            <FETCH>ISCANCELLED</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

function createLedgerGroupRequest(companyName, groupName, parentGroup) {
  const safeName = escapeXml(groupName);
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="${safeName}" ACTION="Create">
            <NAME.LIST>
              <NAME>${safeName}</NAME>
            </NAME.LIST>
            <PARENT>${escapeXml(parentGroup)}</PARENT>
          </GROUP>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

module.exports = {
  listOfLedgersRequest,
  listOfStockItemsRequest,
  listOfStockItemsDetailedRequest,
  createCustomerLedgerRequest,
  createStockItemRequest,
  createStockGroupRequest,
  updateCustomerLedgerRequest,
  updateStockItemRequest,
  createSalesInvoiceRequest,
  createPurchaseVoucherRequest,
  createPaymentOrReceiptRequest,
  listOfLedgersDetailedRequest,
  createCreditOrDebitNoteRequest,
  listOfVouchersRequest,
  createLedgerGroupRequest,
};