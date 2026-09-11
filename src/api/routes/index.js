const express = require('express');
const customerRoutes = require('./customers.routes');
const stockItemRoutes = require('./stockItems.routes');
const salesInvoiceRoutes = require('./salesInvoices.routes');
const purchaseBillRoutes = require('./purchaseBills.routes');
const paymentRoutes = require('./payments.routes');
const creditDebitNoteRoutes = require('./creditDebitNotes.routes');
const voucherRoutes = require('./vouchers.routes');

const router = express.Router();

router.use('/customers', customerRoutes);
router.use('/stock-items', stockItemRoutes);
router.use('/sales-invoices', salesInvoiceRoutes);
router.use('/purchase-bills', purchaseBillRoutes);
router.use('/payments', paymentRoutes);
router.use('/credit-debit-notes', creditDebitNoteRoutes);
router.use('/vouchers', voucherRoutes);


module.exports = router;