const express = require('express');
const controller = require('../controllers/payments.controller');

const router = express.Router();
router.post('/', controller.createPaymentOrReceipt);

module.exports = router;