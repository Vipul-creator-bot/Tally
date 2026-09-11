const express = require('express');
const controller = require('../controllers/salesInvoices.controller');

const router = express.Router();
router.post('/', controller.createSalesInvoice);

module.exports = router;