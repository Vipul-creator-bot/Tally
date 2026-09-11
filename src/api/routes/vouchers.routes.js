const express = require('express');
const controller = require('../controllers/vouchers.controller');

const router = express.Router();
router.get('/:voucherNumber', controller.getVoucherStatus);

module.exports = router;